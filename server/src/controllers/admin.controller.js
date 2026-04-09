const bcrypt = require('bcryptjs');
const UserModel = require('../models/user.model');
const WalletModel = require('../models/wallet.model');
const TransactionModel = require('../models/transaction.model');
const PlatformFeeModel = require('../models/platformFee.model');
const CommissionSplitModel = require('../models/commissionSplit.model');
const WithdrawalModel = require('../models/withdrawal.model');
const RefreshTokenModel = require('../models/refreshToken.model');
const NotificationModel = require('../models/notification.model');
const AdminActionModel = require('../models/adminAction.model');
const ACTIONS = AdminActionModel.ACTIONS;
const Pay2AllService = require('../services/pay2all.service');
const notify = require('../services/notify.service');
const { isValidPan, normalizePan } = require('../utils/pan');
const { shapeRows } = require('../utils/txnVisibility');
const db = require('../config/db');

const crypto = require('crypto');
const ADMIN_USER_ID = parseInt(process.env.PLATFORM_ADMIN_ID || '1', 10);

// Generates a readable-but-strong random password.
// Avoids ambiguous chars (0/O, 1/l/I) so admins can read it off the screen
// and dictate it over the phone without confusion. ~64 bits of entropy at
// 12 chars from a 56-char alphabet.
function generateRandomPassword(length = 12) {
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

const AdminController = {
  async dashboard(req, res) {
    // Fan out all 12 dashboard queries in parallel — each one is a network
    // round-trip to Turso, so doing them sequentially adds ~1s of latency
    // for no reason. Promise.all collapses them into a single wave.
    const [
      rechargeStats,
      userCounts,
      distBalance,
      retailerBalance,
      todayCommission,
      earnings,
      todayCreditsRow,
      todayDebitsRow,
      todayPaymentReqsRow,
      paymentReqStats,
      supportStats,
      unreadNotifications,
    ] = await Promise.all([
      TransactionModel.getTodayStats(),
      UserModel.countByRole(),
      WalletModel.getTotalBalanceByRole('distributor'),
      WalletModel.getTotalBalanceByRole('retailer'),
      TransactionModel.getTodayCommission(),
      // Slice 5: admin earnings rollup (today / 7d / month / lifetime) from
      // commission_splits — surfaced on the dashboard so the admin sees the
      // money funnel without clicking into the platform earnings page.
      CommissionSplitModel.totals(),
      db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM wallet_transactions
        WHERE type = 'credit' AND DATE(created_at) = DATE('now')
      `).get(),
      db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM wallet_transactions
        WHERE type = 'debit' AND DATE(created_at) = DATE('now')
      `).get(),
      db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM payment_requests
        WHERE status = 'approved' AND DATE(created_at) = DATE('now')
      `).get(),
      // Today Payment Requests breakdown
      db.prepare(`
        SELECT
          COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as accepted_amount,
          COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) as accepted_count,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending_count,
          COALESCE(SUM(CASE WHEN status = 'rejected' THEN amount ELSE 0 END), 0) as rejected_amount,
          COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) as rejected_count,
          COALESCE(SUM(amount), 0) as total_amount,
          COUNT(*) as total_count
        FROM payment_requests WHERE DATE(created_at) = DATE('now')
      `).get(),
      // Today Support Tickets breakdown
      db.prepare(`
        SELECT
          COALESCE(SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END), 0) as open_count,
          COALESCE(SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END), 0) as pending_count,
          COALESCE(SUM(CASE WHEN status IN ('resolved','closed') THEN 1 ELSE 0 END), 0) as closed_count,
          COUNT(*) as total_count
        FROM support_tickets WHERE DATE(created_at) = DATE('now')
      `).get(),
      NotificationModel.countUnread(req.user.id),
    ]);

    const distCount = userCounts.find(r => r.role === 'distributor')?.count || 0;
    const retailerCount = userCounts.find(r => r.role === 'retailer')?.count || 0;

    const todayCredits = todayCreditsRow.total;
    const todayDebits = todayDebitsRow.total;
    const todayPaymentReqs = todayPaymentReqsRow.total;

    // Opening balance = total wallet balance at start of day (total - today credits + today debits)
    const totalBalance = distBalance + retailerBalance;
    const openingBalance = totalBalance - todayCredits + todayDebits;
    const closingBalance = totalBalance;

    res.json({
      recharge: rechargeStats,
      users: {
        distributors: distCount,
        retailers: retailerCount,
        total: distCount + retailerCount,
      },
      balance: {
        distributors: distBalance,
        retailers: retailerBalance,
        total: distBalance + retailerBalance,
      },
      statement: {
        opening_balance: openingBalance,
        credit: todayCredits,
        debit: todayDebits,
        payment_requests: todayPaymentReqs,
        commission: todayCommission,
        closing_balance: closingBalance,
      },
      paymentRequests: paymentReqStats,
      supportTickets: supportStats,
      earnings: {
        admin_today: earnings.admin_today || 0,
        admin_last_7_days: earnings.admin_last_7_days || 0,
        admin_this_month: earnings.admin_this_month || 0,
        admin_total_lifetime: earnings.admin_total_lifetime || 0,
        distributor_total_lifetime: earnings.distributor_total_lifetime || 0,
        count: earnings.count || 0,
      },
      unreadNotifications,
    });
  },

  async createDistributor(req, res) {
    const { name, email, phone, password, pan, shop_name, address, city, state, pincode } = req.body;

    if (!name || !email || !phone || !password || !pan) {
      return res.status(400).json({ error: 'Name, email, phone, password and PAN are required' });
    }

    const normalizedPan = normalizePan(pan);
    if (!isValidPan(normalizedPan)) {
      return res.status(400).json({ error: 'PAN must be in format ABCDE1234F (5 letters, 4 digits, 1 letter)' });
    }

    if (await UserModel.findByEmail(email)) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    if (await UserModel.findByPhone(phone)) {
      return res.status(400).json({ error: 'Phone already exists' });
    }
    if (await UserModel.findByPan(normalizedPan)) {
      return res.status(400).json({ error: 'PAN already registered to another account' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const user = await UserModel.create({
      parent_id: req.user.id,
      role: 'distributor',
      name, email, phone, pan: normalizedPan, password_hash,
      shop_name, address, city, state, pincode,
      // Admin-created users are auto-approved.
      approval_status: 'approved',
    });

    notify.welcomeUser({
      user,
      plainPassword: password,
      createdByName: req.user.name,
    });

    AdminActionModel.log({
      req, action: ACTIONS.DISTRIBUTOR_CREATE,
      targetType: 'user', targetId: user.id,
      payload: { name: user.name, email: user.email, phone: user.phone, pan: user.pan },
    });

    res.status(201).json({ message: 'Distributor created', user });
  },

  async listUsers(req, res) {
    const { role, page = 1, limit = 20 } = req.query;

    // Hydrate the wallet balance onto every row so the admin tables can show
    // per-user wallet balance without an N+1 fetch from the client.
    const attachBalance = async (user) => {
      const wallet = await WalletModel.getByUserId(user.id);
      return { ...user, balance: wallet ? wallet.balance : 0 };
    };

    if (role) {
      const result = await UserModel.listByRole(role, parseInt(page), parseInt(limit));
      result.users = await Promise.all(result.users.map(attachBalance));
      return res.json(result);
    }
    // List all non-admin users
    const distributors = await UserModel.listByRole('distributor', 1, 1000);
    const retailers = await UserModel.listByRole('retailer', 1, 1000);
    const distUsers = await Promise.all(distributors.users.map(attachBalance));
    const retailUsers = await Promise.all(retailers.users.map(attachBalance));
    res.json({
      users: [...distUsers, ...retailUsers],
      total: distributors.total + retailers.total,
    });
  },

  async updateUser(req, res) {
    const { id } = req.params;
    const user = await UserModel.findById(parseInt(id));
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await UserModel.update(parseInt(id), req.body);
    AdminActionModel.log({
      req, action: ACTIONS.USER_UPDATE,
      targetType: 'user', targetId: parseInt(id),
      payload: { changes: req.body },
    });
    res.json({ message: 'User updated', user: updated });
  },

  async getTransactions(req, res) {
    const { page = 1, limit = 20, status, service_type, user_id } = req.query;
    const filters = { status, service_type };
    if (user_id) filters.user_id = parseInt(user_id);
    const result = await TransactionModel.listAll(parseInt(page), parseInt(limit), filters);
    res.json(result);
  },

  // Slice 6: detailed All/Failed Transactions feed for the admin role.
  // Returns the full commission split breakdown — admin sees everything.
  async getDetailedTransactions(req, res) {
    const { page = 1, limit = 20, status, service_type } = req.query;
    const result = await TransactionModel.listDetailed({
      scope: 'admin',
      scopeUserId: req.user.id,
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      service_type,
    });
    res.json({
      ...result,
      rows: shapeRows(result.rows, 'admin'),
      role: 'admin',
    });
  },

  // KYC
  async listKYC(req, res) {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND k.status = ?'; params.push(status); }

    const requests = await db.prepare(`
      SELECT k.*, u.name as user_name, u.phone as user_phone
      FROM kyc_requests k JOIN users u ON k.user_id = u.id
      ${where} ORDER BY k.id DESC LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);
    const totalRow = await db.prepare(`SELECT COUNT(*) as count FROM kyc_requests k ${where}`).get(...params);
    res.json({ requests, total: totalRow.count, page: parseInt(page), limit: parseInt(limit) });
  },

  async updateKYC(req, res) {
    const { id } = req.params;
    const { status, remarks } = req.body;
    await db.prepare('UPDATE kyc_requests SET status = ?, remarks = ?, reviewed_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, remarks, req.user.id, parseInt(id));

    if (status === 'approved') {
      const kyc = await db.prepare('SELECT user_id FROM kyc_requests WHERE id = ?').get(parseInt(id));
      if (kyc) {
        await db.prepare("UPDATE users SET kyc_status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(kyc.user_id);
      }
    }
    AdminActionModel.log({
      req, action: ACTIONS.KYC_UPDATE,
      targetType: 'kyc_request', targetId: parseInt(id),
      payload: { status, remarks },
    });
    res.json({ message: 'KYC updated' });
  },

  // Payment Requests
  async listPaymentRequests(req, res) {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND p.status = ?'; params.push(status); }

    const requests = await db.prepare(`
      SELECT p.*, u.name as user_name, u.phone as user_phone
      FROM payment_requests p JOIN users u ON p.user_id = u.id
      ${where} ORDER BY p.id DESC LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);
    const totalRow = await db.prepare(`SELECT COUNT(*) as count FROM payment_requests p ${where}`).get(...params);
    res.json({ requests, total: totalRow.count, page: parseInt(page), limit: parseInt(limit) });
  },

  async updatePaymentRequest(req, res) {
    const { id } = req.params;
    const { status } = req.body;

    const request = await db.prepare('SELECT * FROM payment_requests WHERE id = ?').get(parseInt(id));
    if (!request) return res.status(404).json({ error: 'Request not found' });

    await db.prepare('UPDATE payment_requests SET status = ?, approved_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, req.user.id, parseInt(id));

    if (status === 'approved') {
      await WalletModel.credit(request.user_id, request.amount, 'fund_transfer', parseInt(id), 'Payment request approved');
    }

    AdminActionModel.log({
      req, action: ACTIONS.PAYMENT_REQUEST_UPDATE,
      targetType: 'payment_request', targetId: parseInt(id),
      payload: { status, user_id: request.user_id, amount: request.amount },
    });

    res.json({ message: 'Payment request updated' });
  },

  async creditWallet(req, res) {
    const { user_id, amount, description } = req.body;
    if (!user_id || !amount) return res.status(400).json({ error: 'User ID and amount required' });

    const user = await UserModel.findById(parseInt(user_id));
    if (!user) return res.status(404).json({ error: 'User not found' });

    const result = await WalletModel.credit(parseInt(user_id), parseFloat(amount), 'admin_credit', null, description || 'Admin credit');
    AdminActionModel.log({
      req, action: ACTIONS.WALLET_CREDIT,
      targetType: 'user', targetId: parseInt(user_id),
      payload: { amount: parseFloat(amount), description, new_balance: result.balance },
    });
    res.json({ message: 'Wallet credited', balance: result.balance });
  },

  // Support
  async listSupportTickets(req, res) {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND s.status = ?'; params.push(status); }

    const tickets = await db.prepare(`
      SELECT s.*, u.name as user_name, u.phone as user_phone
      FROM support_tickets s JOIN users u ON s.user_id = u.id
      ${where} ORDER BY s.id DESC LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);
    const totalRow = await db.prepare(`SELECT COUNT(*) as count FROM support_tickets s ${where}`).get(...params);
    res.json({ tickets, total: totalRow.count, page: parseInt(page), limit: parseInt(limit) });
  },

  async updateSupportTicket(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    await db.prepare('UPDATE support_tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, parseInt(id));
    AdminActionModel.log({
      req, action: ACTIONS.SUPPORT_TICKET_UPDATE,
      targetType: 'support_ticket', targetId: parseInt(id),
      payload: { status },
    });
    res.json({ message: 'Ticket updated' });
  },

  async getSettings(req, res) {
    const settings = await db.prepare('SELECT * FROM settings').all();
    const obj = {};
    settings.forEach(s => { obj[s.key] = s.value; });
    res.json(obj);
  },

  async updateSettings(req, res) {
    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
    const entries = Object.entries(req.body);
    const txn = db.transaction(async () => {
      for (const [key, value] of entries) {
        await upsert.run(key, String(value));
      }
    });
    await txn();
    AdminActionModel.log({
      req, action: ACTIONS.SETTINGS_UPDATE,
      targetType: 'settings', targetId: null,
      payload: { keys: entries.map(([k]) => k), values: req.body },
    });
    res.json({ message: 'Settings updated' });
  },

  async createRetailer(req, res) {
    const { name, email, phone, password, pan, parent_id, shop_name, address, city, state, pincode } = req.body;

    if (!name || !email || !phone || !password || !pan || !parent_id) {
      return res.status(400).json({ error: 'Name, email, phone, password, PAN and parent_id are required' });
    }

    const normalizedPan = normalizePan(pan);
    if (!isValidPan(normalizedPan)) {
      return res.status(400).json({ error: 'PAN must be in format ABCDE1234F (5 letters, 4 digits, 1 letter)' });
    }

    const parent = await UserModel.findById(parseInt(parent_id));
    if (!parent || parent.role !== 'distributor') {
      return res.status(400).json({ error: 'Invalid parent_id. Must be a valid distributor.' });
    }

    if (await UserModel.findByEmail(email)) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    if (await UserModel.findByPhone(phone)) {
      return res.status(400).json({ error: 'Phone already exists' });
    }
    if (await UserModel.findByPan(normalizedPan)) {
      return res.status(400).json({ error: 'PAN already registered to another account' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const user = await UserModel.create({
      parent_id: parseInt(parent_id),
      role: 'retailer',
      name, email, phone, pan: normalizedPan, password_hash,
      shop_name, address, city, state, pincode,
      // Admin-created retailers are auto-approved (no queue).
      approval_status: 'approved',
    });

    notify.welcomeUser({
      user,
      plainPassword: password,
      createdByName: req.user.name,
    });

    AdminActionModel.log({
      req, action: ACTIONS.RETAILER_CREATE,
      targetType: 'user', targetId: user.id,
      payload: { name: user.name, email: user.email, parent_id: parseInt(parent_id) },
    });

    res.status(201).json({ message: 'Retailer created', user });
  },

  // ---------- Retailer approval queue ----------

  async listPendingRetailers(req, res) {
    const { page = 1, limit = 20 } = req.query;
    const result = await UserModel.listPendingRetailers(parseInt(page), parseInt(limit));
    res.json(result);
  },

  async approveRetailer(req, res) {
    const id = parseInt(req.params.id);
    const user = await UserModel.findById(id);
    if (!user || user.role !== 'retailer') {
      return res.status(404).json({ error: 'Retailer not found' });
    }
    if (user.approval_status === 'approved') {
      return res.status(400).json({ error: 'Retailer is already approved' });
    }
    const updated = await UserModel.setApprovalStatus(id, 'approved');
    notify.retailerApproved({ retailer: updated });
    AdminActionModel.log({
      req, action: ACTIONS.RETAILER_APPROVE,
      targetType: 'user', targetId: id,
      payload: { name: updated.name, email: updated.email },
    });
    res.json({ message: 'Retailer approved', user: updated });
  },

  async rejectRetailer(req, res) {
    const id = parseInt(req.params.id);
    const user = await UserModel.findById(id);
    if (!user || user.role !== 'retailer') {
      return res.status(404).json({ error: 'Retailer not found' });
    }
    const updated = await UserModel.setApprovalStatus(id, 'rejected');
    notify.retailerRejected({ retailer: updated });
    AdminActionModel.log({
      req, action: ACTIONS.RETAILER_REJECT,
      targetType: 'user', targetId: id,
      payload: { name: updated.name, email: updated.email },
    });
    res.json({ message: 'Retailer rejected', user: updated });
  },

  // ---------- Slice 4: Withdrawals ----------

  async listWithdrawals(req, res) {
    const { status, page = 1, limit = 20 } = req.query;
    const result = await WithdrawalModel.listAll({ status, page: parseInt(page), limit: parseInt(limit) });
    res.json(result);
  },

  async approveWithdrawal(req, res) {
    const id = parseInt(req.params.id);
    const { remarks } = req.body || {};
    try {
      const w = await WithdrawalModel.approve(id, req.user.id, remarks);
      AdminActionModel.log({
        req, action: ACTIONS.WITHDRAWAL_APPROVE,
        targetType: 'withdrawal', targetId: id,
        payload: { user_id: w.user_id, amount: w.amount, method: w.method, remarks },
      });
      // Note: do NOT email the user yet — they get emailed when we
      // actually mark it paid (markPaidWithdrawal). At this point the
      // money is just in escrow.
      res.json({ message: 'Withdrawal approved. Wallet debited. Now make the bank transfer and click "Mark Paid" with the UTR.', withdrawal: w });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * Step 2 of the withdrawal payout flow: admin records the actual UTR
   * after they've made the real bank/UPI transfer. Wallet is already
   * debited from the approve step — this is purely metadata + status
   * flip + user notification.
   */
  async markPaidWithdrawal(req, res) {
    const id = parseInt(req.params.id);
    const { bank_reference, remarks } = req.body || {};
    try {
      const w = await WithdrawalModel.markPaid(id, req.user.id, bank_reference, remarks);
      const user = await UserModel.findById(w.user_id);
      // Now is the right time to email the user — the money has actually moved.
      notify.withdrawalApproved({ user, withdrawal: w });
      AdminActionModel.log({
        req, action: ACTIONS.WITHDRAWAL_MARK_PAID,
        targetType: 'withdrawal', targetId: id,
        payload: { user_id: w.user_id, amount: w.amount, method: w.method, bank_reference: w.bank_reference, remarks },
      });
      res.json({ message: 'Withdrawal marked as paid', withdrawal: w });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async rejectWithdrawal(req, res) {
    const id = parseInt(req.params.id);
    const { remarks } = req.body || {};
    try {
      const w = await WithdrawalModel.reject(id, req.user.id, remarks);
      const user = await UserModel.findById(w.user_id);
      notify.withdrawalRejected({ user, withdrawal: w, remarks });
      AdminActionModel.log({
        req, action: ACTIONS.WITHDRAWAL_REJECT,
        targetType: 'withdrawal', targetId: id,
        payload: { user_id: w.user_id, amount: w.amount, method: w.method, remarks },
      });
      res.json({ message: 'Withdrawal rejected', withdrawal: w });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  // ---------- Slice 4: Suspension with wallet sweep ----------
  //
  // Per project_mahakal_onboarding: when admin suspends a distributor or
  // retailer the account is fully disabled AND any wallet balance is
  // SWEPT to the admin wallet, with a clean audit trail on both sides.
  // Refresh tokens are revoked so an in-flight session cannot keep going.

  async suspendUser(req, res) {
    const id = parseInt(req.params.id);
    if (id === ADMIN_USER_ID) {
      return res.status(400).json({ error: 'Cannot suspend the admin account' });
    }
    const user = await UserModel.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Cannot suspend an admin user' });
    }
    if (user.status === 'blocked') {
      return res.status(400).json({ error: 'User is already blocked' });
    }

    const wallet = await WalletModel.getByUserId(id);
    const sweepAmount = wallet ? Math.round(wallet.balance * 100) / 100 : 0;

    const txn = db.transaction(async () => {
      // 1. Sweep wallet (only if there's anything to sweep).
      if (sweepAmount > 0) {
        await WalletModel.debit(
          id,
          sweepAmount,
          'suspension_sweep',
          id,
          `Wallet swept on suspension of ${user.role} ${user.name}`
        );
        await WalletModel.credit(
          ADMIN_USER_ID,
          sweepAmount,
          'suspension_sweep',
          id,
          `Sweep from suspended ${user.role} ${user.name} (#${id})`
        );
      }
      // 2. Block the account.
      await UserModel.updateStatus(id, 'blocked');
      // 3. Revoke any active sessions.
      try { await RefreshTokenModel.revokeAllForUser(id); } catch {}
    });
    await txn();

    notify.suspension({ user, sweptAmount: sweepAmount });

    AdminActionModel.log({
      req, action: ACTIONS.USER_SUSPEND,
      targetType: 'user', targetId: id,
      payload: { name: user.name, role: user.role, swept_amount: sweepAmount },
    });

    const refreshed = await UserModel.findById(id);
    res.json({
      message: `User suspended${sweepAmount > 0 ? ` and ₹${sweepAmount.toFixed(2)} swept to admin wallet` : ''}`,
      user: refreshed,
      sweptAmount: sweepAmount,
    });
  },

  async reactivateUser(req, res) {
    // Reactivation does NOT restore swept funds — that's by design. The
    // swept funds are now part of the admin wallet's audit trail and
    // would have to be transferred back manually if the admin wants to.
    const id = parseInt(req.params.id);
    const user = await UserModel.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.status === 'active') {
      return res.status(400).json({ error: 'User is already active' });
    }
    await UserModel.updateStatus(id, 'active');
    AdminActionModel.log({
      req, action: ACTIONS.USER_REACTIVATE,
      targetType: 'user', targetId: id,
      payload: { name: user.name, role: user.role },
    });
    const refreshed = await UserModel.findById(id);
    res.json({ message: 'User reactivated', user: refreshed });
  },

  // ---------- Slice 4: Generic admin → any user wallet transfer ----------

  // ---------- Admin credentials management ----------
  //
  // Plaintext passwords cannot be retrieved — they are bcrypt hashes.
  // This endpoint lets the admin RESET a user's password to a new value
  // (either provided by the admin or randomly generated by the server)
  // and returns the new plaintext exactly ONCE so the admin can pass it
  // on. Existing sessions are killed (refresh tokens revoked) so the
  // user must log in again with the new password.

  async resetUserPassword(req, res) {
    const id = parseInt(req.params.id);
    if (id === ADMIN_USER_ID) {
      return res.status(400).json({
        error: 'Use the change-password flow on your own account, not this admin reset endpoint.',
      });
    }
    const user = await UserModel.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Cannot reset another admin user from here' });
    }

    // Either admin provided a password, or we generate one.
    let newPassword = req.body && typeof req.body.newPassword === 'string'
      ? req.body.newPassword.trim()
      : '';
    let generated = false;

    if (!newPassword) {
      newPassword = generateRandomPassword(12);
      generated = true;
    } else if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    await db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(hash, id);

    // Force the user out of every active session.
    try { await RefreshTokenModel.revokeAllForUser(id); } catch {}

    AdminActionModel.log({
      req, action: ACTIONS.USER_RESET_PASSWORD,
      targetType: 'user', targetId: id,
      // NEVER log the password itself — only that one was generated/set.
      payload: { name: user.name, email: user.email, role: user.role, generated },
    });

    res.json({
      message: 'Password reset successful. The user must log in again.',
      // RETURNED ONCE — never persisted in plaintext anywhere on the server.
      newPassword,
      generated,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  },

  // ---------- Slice 5: Notifications (admin inbox) ----------

  async listNotifications(req, res) {
    const { page = 1, limit = 50, unread } = req.query;
    const result = await NotificationModel.listByUser(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unread === '1' || unread === 'true',
    });
    res.json(result);
  },

  async markNotificationRead(req, res) {
    const id = parseInt(req.params.id);
    await NotificationModel.markRead(id, req.user.id);
    res.json({ message: 'Marked as read' });
  },

  async markAllNotificationsRead(req, res) {
    const r = await NotificationModel.markAllRead(req.user.id);
    res.json({ message: 'All notifications marked as read', changed: r.changed });
  },

  async notificationsCount(req, res) {
    const unread = await NotificationModel.countUnread(req.user.id);
    res.json({ unread });
  },

  // ---------- Pay2All float health & reconciliation ----------
  //
  // The most operationally critical admin view in the platform: shows
  // whether the Pay2All master wallet has enough money to back every
  // outstanding internal wallet credit. Without this, retailers can
  // hold ledger credit that the platform can't actually deliver on.

  async floatStatus(req, res) {
    // The Pay2All call dominates this endpoint (~400-1000ms depending on
    // their backend mood). Run all three calls in parallel so the two
    // cheap Turso queries don't add their latency on top.
    const [balanceResult, sumRow, breakdown] = await Promise.all([
      Pay2AllService.checkBalance(),
      db.prepare('SELECT COALESCE(SUM(balance), 0) AS s FROM wallets').get(),
      db.prepare(`
        SELECT u.role AS role, COALESCE(SUM(w.balance), 0) AS sum
        FROM wallets w JOIN users u ON u.id = w.user_id
        GROUP BY u.role
      `).all(),
    ]);
    const pay2allBalance = Number(balanceResult.balance ?? 0);
    const internalTotal = Number(sumRow.s || 0);

    const delta = pay2allBalance - internalTotal;
    const coveragePct = internalTotal > 0
      ? (pay2allBalance / internalTotal) * 100
      : (pay2allBalance > 0 ? 9999 : 100);

    let health = 'healthy';
    let message = 'Pay2All master fully covers all internal wallets.';
    if (coveragePct < 100) {
      health = 'critical';
      message = `Pay2All master is ₹${Math.abs(delta).toFixed(2)} below internal wallet credits. Top up immediately.`;
    } else if (coveragePct < 120) {
      health = 'warning';
      message = `Pay2All master only covers ${coveragePct.toFixed(1)}% of internal wallets. Top up soon.`;
    }

    res.json({
      pay2all_balance: pay2allBalance,
      pay2all_live: Pay2AllService.isLive(),
      internal_total: Number(internalTotal.toFixed(2)),
      internal_breakdown: breakdown.reduce((acc, r) => { acc[r.role] = Number(r.sum); return acc; }, {}),
      coverage_pct: Number(coveragePct.toFixed(2)),
      delta: Number(delta.toFixed(2)),
      health,
      message,
      checked_at: new Date().toISOString(),
    });
  },

  async pay2allDepositInfo(req, res) {
    const info = await Pay2AllService.getDepositInfo();
    res.json(info);
  },

  // Last N days reconciliation: txns attempted / successful / failed,
  // gross recharge volume, total commission distributed across the
  // three layers, plus the net change to all internal wallets.
  async reconciliationReport(req, res) {
    const days = Math.min(parseInt(req.query.days || '7', 10), 90);
    const rows = [];
    for (let i = 0; i < days; i++) {
      const dateExpr = `date('now', '-${i} days')`;
      const txn = await db.prepare(`
        SELECT
          COUNT(*) AS attempted,
          COALESCE(SUM(CASE WHEN status='success' THEN 1 ELSE 0 END), 0) AS success_count,
          COALESCE(SUM(CASE WHEN status='failed'  THEN 1 ELSE 0 END), 0) AS failed_count,
          COALESCE(SUM(CASE WHEN status='refunded' THEN 1 ELSE 0 END), 0) AS refunded_count,
          COALESCE(SUM(CASE WHEN status='success' THEN amount ELSE 0 END), 0) AS gross_amount,
          COALESCE(SUM(CASE WHEN status='success' THEN commission ELSE 0 END), 0) AS retailer_commission_total
        FROM transactions
        WHERE date(created_at) = ${dateExpr}
      `).get();

      const split = await db.prepare(`
        SELECT
          COALESCE(SUM(admin_share_amount), 0) AS admin_total,
          COALESCE(SUM(distributor_share_amount), 0) AS dist_total,
          COALESCE(SUM(retailer_commission_amount), 0) AS retailer_total
        FROM commission_splits
        WHERE date(created_at) = ${dateExpr}
      `).get();

      const creditsRow = await db.prepare(`
        SELECT COALESCE(SUM(amount), 0) AS s FROM wallet_transactions
        WHERE type='credit' AND date(created_at) = ${dateExpr}
      `).get();
      const credits = creditsRow.s || 0;

      const debitsRow = await db.prepare(`
        SELECT COALESCE(SUM(amount), 0) AS s FROM wallet_transactions
        WHERE type='debit' AND date(created_at) = ${dateExpr}
      `).get();
      const debits = debitsRow.s || 0;

      const dateRowResult = await db.prepare(`SELECT ${dateExpr} AS d`).get();
      const dateRow = dateRowResult.d;

      rows.push({
        date: dateRow,
        recharges_attempted: txn.attempted,
        recharges_success: txn.success_count,
        recharges_failed: txn.failed_count,
        recharges_refunded: txn.refunded_count,
        gross_recharge_amount: Number(txn.gross_amount),
        retailer_commission: Number(split.retailer_total),
        distributor_commission: Number(split.dist_total),
        admin_commission: Number(split.admin_total),
        wallet_credits: Number(credits),
        wallet_debits: Number(debits),
        net_change: Number((credits - debits).toFixed(2)),
      });
    }
    res.json({ days: rows });
  },

  async transferToUser(req, res) {
    const { to_user_id, amount, description } = req.body;
    if (!to_user_id || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'to_user_id and positive amount are required' });
    }
    const target = await UserModel.findById(parseInt(to_user_id));
    if (!target) return res.status(404).json({ error: 'Target user not found' });
    if (target.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot transfer to yourself' });
    }
    if (target.status !== 'active') {
      return res.status(400).json({ error: 'Target user is not active' });
    }

    const amt = parseFloat(amount);
    try {
      const txn = db.transaction(async () => {
        await WalletModel.debit(req.user.id, amt, 'wallet_transfer', target.id, description || `Transfer to ${target.name}`);
        await WalletModel.credit(target.id, amt, 'wallet_transfer', req.user.id, description || `Transfer from admin`);
      });
      await txn();
      AdminActionModel.log({
        req, action: ACTIONS.WALLET_TRANSFER,
        targetType: 'user', targetId: target.id,
        payload: { to_name: target.name, amount: amt, description },
      });
      const adminWallet = await WalletModel.getByUserId(req.user.id);
      res.json({ message: 'Transfer successful', balance: adminWallet ? adminWallet.balance : 0 });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async getWalletTransactions(req, res) {
    const { page = 1, limit = 20, type, user_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE 1=1';
    const params = [];
    if (type) { where += ' AND wt.type = ?'; params.push(type); }
    if (user_id) { where += ' AND wt.user_id = ?'; params.push(parseInt(user_id)); }

    const transactions = await db.prepare(`
      SELECT wt.*, u.name as user_name, u.phone as user_phone, u.role as user_role
      FROM wallet_transactions wt JOIN users u ON wt.user_id = u.id
      ${where} ORDER BY wt.id DESC LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);
    const totalRow = await db.prepare(`SELECT COUNT(*) as count FROM wallet_transactions wt ${where}`).get(...params);
    res.json({ transactions, total: totalRow.count, page: parseInt(page), limit: parseInt(limit) });
  },

  // ---------- Audit log (slice 9 — admin action history) ----------
  //
  // Append-only history of every sensitive admin write. Powers the
  // disputes / compliance view: "who suspended this user, when, why?"
  async listAuditLog(req, res) {
    const { page = 1, limit = 50, action, target_type, admin_user_id } = req.query;
    const result = await AdminActionModel.list({
      page: parseInt(page),
      limit: parseInt(limit),
      action,
      targetType: target_type,
      adminUserId: admin_user_id ? parseInt(admin_user_id) : undefined,
    });
    res.json(result);
  },

  async platformFees(req, res) {
    // Slice 3: this endpoint now reads from commission_splits (the new
    // 0.25% / 0.5% override model). The legacy `platform_fees` table is
    // kept for historical top-up fee data and is no longer written by the
    // recharge path. Razorpay top-ups still use platform_fees because the
    // user only changed retailer commission economics — top-up fees are
    // a separate revenue line.
    const { page = 1, limit = 50, from, to } = req.query;
    const list = await CommissionSplitModel.list({ page: parseInt(page), limit: parseInt(limit), from, to });
    const totals = await CommissionSplitModel.totals();
    const config = await CommissionSplitModel.getSplitConfig();
    // Legacy top-up fee history (kept for the same page, separate section).
    const topupTotals = await PlatformFeeModel.totals();
    res.json({
      ...list,
      totals,
      config,
      topupTotals,
    });
  },
};

module.exports = AdminController;

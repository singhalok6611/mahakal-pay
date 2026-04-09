const bcrypt = require('bcryptjs');
const UserModel = require('../models/user.model');
const WalletModel = require('../models/wallet.model');
const TransactionModel = require('../models/transaction.model');
const PlatformFeeModel = require('../models/platformFee.model');
const CommissionSplitModel = require('../models/commissionSplit.model');
const WithdrawalModel = require('../models/withdrawal.model');
const RefreshTokenModel = require('../models/refreshToken.model');
const NotificationModel = require('../models/notification.model');
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
  dashboard(req, res) {
    const rechargeStats = TransactionModel.getTodayStats();
    const userCounts = UserModel.countByRole();
    const distBalance = WalletModel.getTotalBalanceByRole('distributor');
    const retailerBalance = WalletModel.getTotalBalanceByRole('retailer');
    const todayCommission = TransactionModel.getTodayCommission();
    // Slice 5: admin earnings rollup (today / 7d / month / lifetime) from
    // commission_splits — surfaced on the dashboard so the admin sees the
    // money funnel without clicking into the platform earnings page.
    const earnings = CommissionSplitModel.totals();

    const distCount = userCounts.find(r => r.role === 'distributor')?.count || 0;
    const retailerCount = userCounts.find(r => r.role === 'retailer')?.count || 0;

    // Today's wallet statement
    const todayCredits = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM wallet_transactions
      WHERE type = 'credit' AND DATE(created_at) = DATE('now')
    `).get().total;

    const todayDebits = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM wallet_transactions
      WHERE type = 'debit' AND DATE(created_at) = DATE('now')
    `).get().total;

    const todayPaymentReqs = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payment_requests
      WHERE status = 'approved' AND DATE(created_at) = DATE('now')
    `).get().total;

    // Opening balance = total wallet balance at start of day (total - today credits + today debits)
    const totalBalance = distBalance + retailerBalance;
    const openingBalance = totalBalance - todayCredits + todayDebits;
    const closingBalance = totalBalance;

    // Today Payment Requests breakdown
    const paymentReqStats = db.prepare(`
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
    `).get();

    // Today Support Tickets breakdown
    const supportStats = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END), 0) as open_count,
        COALESCE(SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END), 0) as pending_count,
        COALESCE(SUM(CASE WHEN status IN ('resolved','closed') THEN 1 ELSE 0 END), 0) as closed_count,
        COUNT(*) as total_count
      FROM support_tickets WHERE DATE(created_at) = DATE('now')
    `).get();

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
      unreadNotifications: NotificationModel.countUnread(req.user.id),
    });
  },

  createDistributor(req, res) {
    const { name, email, phone, password, pan, shop_name, address, city, state, pincode } = req.body;

    if (!name || !email || !phone || !password || !pan) {
      return res.status(400).json({ error: 'Name, email, phone, password and PAN are required' });
    }

    const normalizedPan = normalizePan(pan);
    if (!isValidPan(normalizedPan)) {
      return res.status(400).json({ error: 'PAN must be in format ABCDE1234F (5 letters, 4 digits, 1 letter)' });
    }

    if (UserModel.findByEmail(email)) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    if (UserModel.findByPhone(phone)) {
      return res.status(400).json({ error: 'Phone already exists' });
    }
    if (UserModel.findByPan(normalizedPan)) {
      return res.status(400).json({ error: 'PAN already registered to another account' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const user = UserModel.create({
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

    res.status(201).json({ message: 'Distributor created', user });
  },

  listUsers(req, res) {
    const { role, page = 1, limit = 20 } = req.query;

    // Hydrate the wallet balance onto every row so the admin tables can show
    // per-user wallet balance without an N+1 fetch from the client.
    const attachBalance = (user) => {
      const wallet = WalletModel.getByUserId(user.id);
      return { ...user, balance: wallet ? wallet.balance : 0 };
    };

    if (role) {
      const result = UserModel.listByRole(role, parseInt(page), parseInt(limit));
      result.users = result.users.map(attachBalance);
      return res.json(result);
    }
    // List all non-admin users
    const distributors = UserModel.listByRole('distributor', 1, 1000);
    const retailers = UserModel.listByRole('retailer', 1, 1000);
    res.json({
      users: [...distributors.users.map(attachBalance), ...retailers.users.map(attachBalance)],
      total: distributors.total + retailers.total,
    });
  },

  updateUser(req, res) {
    const { id } = req.params;
    const user = UserModel.findById(parseInt(id));
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = UserModel.update(parseInt(id), req.body);
    res.json({ message: 'User updated', user: updated });
  },

  getTransactions(req, res) {
    const { page = 1, limit = 20, status, service_type, user_id } = req.query;
    const filters = { status, service_type };
    if (user_id) filters.user_id = parseInt(user_id);
    const result = TransactionModel.listAll(parseInt(page), parseInt(limit), filters);
    res.json(result);
  },

  // Slice 6: detailed All/Failed Transactions feed for the admin role.
  // Returns the full commission split breakdown — admin sees everything.
  getDetailedTransactions(req, res) {
    const { page = 1, limit = 20, status, service_type } = req.query;
    const result = TransactionModel.listDetailed({
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
  listKYC(req, res) {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND k.status = ?'; params.push(status); }

    const requests = db.prepare(`
      SELECT k.*, u.name as user_name, u.phone as user_phone
      FROM kyc_requests k JOIN users u ON k.user_id = u.id
      ${where} ORDER BY k.id DESC LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);
    const total = db.prepare(`SELECT COUNT(*) as count FROM kyc_requests k ${where}`).get(...params).count;
    res.json({ requests, total, page: parseInt(page), limit: parseInt(limit) });
  },

  updateKYC(req, res) {
    const { id } = req.params;
    const { status, remarks } = req.body;
    db.prepare('UPDATE kyc_requests SET status = ?, remarks = ?, reviewed_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, remarks, req.user.id, parseInt(id));

    if (status === 'approved') {
      const kyc = db.prepare('SELECT user_id FROM kyc_requests WHERE id = ?').get(parseInt(id));
      if (kyc) {
        db.prepare("UPDATE users SET kyc_status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(kyc.user_id);
      }
    }
    res.json({ message: 'KYC updated' });
  },

  // Payment Requests
  listPaymentRequests(req, res) {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND p.status = ?'; params.push(status); }

    const requests = db.prepare(`
      SELECT p.*, u.name as user_name, u.phone as user_phone
      FROM payment_requests p JOIN users u ON p.user_id = u.id
      ${where} ORDER BY p.id DESC LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);
    const total = db.prepare(`SELECT COUNT(*) as count FROM payment_requests p ${where}`).get(...params).count;
    res.json({ requests, total, page: parseInt(page), limit: parseInt(limit) });
  },

  updatePaymentRequest(req, res) {
    const { id } = req.params;
    const { status } = req.body;

    const request = db.prepare('SELECT * FROM payment_requests WHERE id = ?').get(parseInt(id));
    if (!request) return res.status(404).json({ error: 'Request not found' });

    db.prepare('UPDATE payment_requests SET status = ?, approved_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, req.user.id, parseInt(id));

    if (status === 'approved') {
      WalletModel.credit(request.user_id, request.amount, 'fund_transfer', parseInt(id), 'Payment request approved');
    }

    res.json({ message: 'Payment request updated' });
  },

  creditWallet(req, res) {
    const { user_id, amount, description } = req.body;
    if (!user_id || !amount) return res.status(400).json({ error: 'User ID and amount required' });

    const user = UserModel.findById(parseInt(user_id));
    if (!user) return res.status(404).json({ error: 'User not found' });

    const result = WalletModel.credit(parseInt(user_id), parseFloat(amount), 'admin_credit', null, description || 'Admin credit');
    res.json({ message: 'Wallet credited', balance: result.balance });
  },

  // Support
  listSupportTickets(req, res) {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND s.status = ?'; params.push(status); }

    const tickets = db.prepare(`
      SELECT s.*, u.name as user_name, u.phone as user_phone
      FROM support_tickets s JOIN users u ON s.user_id = u.id
      ${where} ORDER BY s.id DESC LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);
    const total = db.prepare(`SELECT COUNT(*) as count FROM support_tickets s ${where}`).get(...params).count;
    res.json({ tickets, total, page: parseInt(page), limit: parseInt(limit) });
  },

  updateSupportTicket(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare('UPDATE support_tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, parseInt(id));
    res.json({ message: 'Ticket updated' });
  },

  getSettings(req, res) {
    const settings = db.prepare('SELECT * FROM settings').all();
    const obj = {};
    settings.forEach(s => { obj[s.key] = s.value; });
    res.json(obj);
  },

  updateSettings(req, res) {
    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
    const entries = Object.entries(req.body);
    const txn = db.transaction(() => {
      for (const [key, value] of entries) {
        upsert.run(key, String(value));
      }
    });
    txn();
    res.json({ message: 'Settings updated' });
  },

  createRetailer(req, res) {
    const { name, email, phone, password, pan, parent_id, shop_name, address, city, state, pincode } = req.body;

    if (!name || !email || !phone || !password || !pan || !parent_id) {
      return res.status(400).json({ error: 'Name, email, phone, password, PAN and parent_id are required' });
    }

    const normalizedPan = normalizePan(pan);
    if (!isValidPan(normalizedPan)) {
      return res.status(400).json({ error: 'PAN must be in format ABCDE1234F (5 letters, 4 digits, 1 letter)' });
    }

    const parent = UserModel.findById(parseInt(parent_id));
    if (!parent || parent.role !== 'distributor') {
      return res.status(400).json({ error: 'Invalid parent_id. Must be a valid distributor.' });
    }

    if (UserModel.findByEmail(email)) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    if (UserModel.findByPhone(phone)) {
      return res.status(400).json({ error: 'Phone already exists' });
    }
    if (UserModel.findByPan(normalizedPan)) {
      return res.status(400).json({ error: 'PAN already registered to another account' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const user = UserModel.create({
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

    res.status(201).json({ message: 'Retailer created', user });
  },

  // ---------- Retailer approval queue ----------

  listPendingRetailers(req, res) {
    const { page = 1, limit = 20 } = req.query;
    const result = UserModel.listPendingRetailers(parseInt(page), parseInt(limit));
    res.json(result);
  },

  approveRetailer(req, res) {
    const id = parseInt(req.params.id);
    const user = UserModel.findById(id);
    if (!user || user.role !== 'retailer') {
      return res.status(404).json({ error: 'Retailer not found' });
    }
    if (user.approval_status === 'approved') {
      return res.status(400).json({ error: 'Retailer is already approved' });
    }
    const updated = UserModel.setApprovalStatus(id, 'approved');
    notify.retailerApproved({ retailer: updated });
    res.json({ message: 'Retailer approved', user: updated });
  },

  rejectRetailer(req, res) {
    const id = parseInt(req.params.id);
    const user = UserModel.findById(id);
    if (!user || user.role !== 'retailer') {
      return res.status(404).json({ error: 'Retailer not found' });
    }
    const updated = UserModel.setApprovalStatus(id, 'rejected');
    notify.retailerRejected({ retailer: updated });
    res.json({ message: 'Retailer rejected', user: updated });
  },

  // ---------- Slice 4: Withdrawals ----------

  listWithdrawals(req, res) {
    const { status, page = 1, limit = 20 } = req.query;
    const result = WithdrawalModel.listAll({ status, page: parseInt(page), limit: parseInt(limit) });
    res.json(result);
  },

  approveWithdrawal(req, res) {
    const id = parseInt(req.params.id);
    const { remarks } = req.body || {};
    try {
      const w = WithdrawalModel.approve(id, req.user.id, remarks);
      const user = UserModel.findById(w.user_id);
      notify.withdrawalApproved({ user, withdrawal: w });
      res.json({ message: 'Withdrawal approved and wallet debited', withdrawal: w });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  rejectWithdrawal(req, res) {
    const id = parseInt(req.params.id);
    const { remarks } = req.body || {};
    try {
      const w = WithdrawalModel.reject(id, req.user.id, remarks);
      const user = UserModel.findById(w.user_id);
      notify.withdrawalRejected({ user, withdrawal: w, remarks });
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

  suspendUser(req, res) {
    const id = parseInt(req.params.id);
    if (id === ADMIN_USER_ID) {
      return res.status(400).json({ error: 'Cannot suspend the admin account' });
    }
    const user = UserModel.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Cannot suspend an admin user' });
    }
    if (user.status === 'blocked') {
      return res.status(400).json({ error: 'User is already blocked' });
    }

    const wallet = WalletModel.getByUserId(id);
    const sweepAmount = wallet ? Math.round(wallet.balance * 100) / 100 : 0;

    const txn = db.transaction(() => {
      // 1. Sweep wallet (only if there's anything to sweep).
      if (sweepAmount > 0) {
        WalletModel.debit(
          id,
          sweepAmount,
          'suspension_sweep',
          id,
          `Wallet swept on suspension of ${user.role} ${user.name}`
        );
        WalletModel.credit(
          ADMIN_USER_ID,
          sweepAmount,
          'suspension_sweep',
          id,
          `Sweep from suspended ${user.role} ${user.name} (#${id})`
        );
      }
      // 2. Block the account.
      UserModel.updateStatus(id, 'blocked');
      // 3. Revoke any active sessions.
      try { RefreshTokenModel.revokeAllForUser(id); } catch {}
    });
    txn();

    notify.suspension({ user, sweptAmount: sweepAmount });

    res.json({
      message: `User suspended${sweepAmount > 0 ? ` and ₹${sweepAmount.toFixed(2)} swept to admin wallet` : ''}`,
      user: UserModel.findById(id),
      sweptAmount: sweepAmount,
    });
  },

  reactivateUser(req, res) {
    // Reactivation does NOT restore swept funds — that's by design. The
    // swept funds are now part of the admin wallet's audit trail and
    // would have to be transferred back manually if the admin wants to.
    const id = parseInt(req.params.id);
    const user = UserModel.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.status === 'active') {
      return res.status(400).json({ error: 'User is already active' });
    }
    UserModel.updateStatus(id, 'active');
    res.json({ message: 'User reactivated', user: UserModel.findById(id) });
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

  resetUserPassword(req, res) {
    const id = parseInt(req.params.id);
    if (id === ADMIN_USER_ID) {
      return res.status(400).json({
        error: 'Use the change-password flow on your own account, not this admin reset endpoint.',
      });
    }
    const user = UserModel.findById(id);
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
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(hash, id);

    // Force the user out of every active session.
    try { RefreshTokenModel.revokeAllForUser(id); } catch {}

    res.json({
      message: 'Password reset successful. The user must log in again.',
      // RETURNED ONCE — never persisted in plaintext anywhere on the server.
      newPassword,
      generated,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  },

  // ---------- Slice 5: Notifications (admin inbox) ----------

  listNotifications(req, res) {
    const { page = 1, limit = 50, unread } = req.query;
    const result = NotificationModel.listByUser(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unread === '1' || unread === 'true',
    });
    res.json(result);
  },

  markNotificationRead(req, res) {
    const id = parseInt(req.params.id);
    NotificationModel.markRead(id, req.user.id);
    res.json({ message: 'Marked as read' });
  },

  markAllNotificationsRead(req, res) {
    const r = NotificationModel.markAllRead(req.user.id);
    res.json({ message: 'All notifications marked as read', changed: r.changed });
  },

  notificationsCount(req, res) {
    res.json({ unread: NotificationModel.countUnread(req.user.id) });
  },

  // ---------- Pay2All float health & reconciliation ----------
  //
  // The most operationally critical admin view in the platform: shows
  // whether the Pay2All master wallet has enough money to back every
  // outstanding internal wallet credit. Without this, retailers can
  // hold ledger credit that the platform can't actually deliver on.

  async floatStatus(req, res) {
    const balanceResult = await Pay2AllService.checkBalance();
    const pay2allBalance = Number(balanceResult.balance ?? 0);

    const internalTotal = Number(
      db.prepare('SELECT COALESCE(SUM(balance), 0) AS s FROM wallets').get().s || 0
    );
    const breakdown = db.prepare(`
      SELECT u.role AS role, COALESCE(SUM(w.balance), 0) AS sum
      FROM wallets w JOIN users u ON u.id = w.user_id
      GROUP BY u.role
    `).all();

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
  reconciliationReport(req, res) {
    const days = Math.min(parseInt(req.query.days || '7', 10), 90);
    const rows = [];
    for (let i = 0; i < days; i++) {
      const dateExpr = `date('now', '-${i} days')`;
      const txn = db.prepare(`
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

      const split = db.prepare(`
        SELECT
          COALESCE(SUM(admin_share_amount), 0) AS admin_total,
          COALESCE(SUM(distributor_share_amount), 0) AS dist_total,
          COALESCE(SUM(retailer_commission_amount), 0) AS retailer_total
        FROM commission_splits
        WHERE date(created_at) = ${dateExpr}
      `).get();

      const credits = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) AS s FROM wallet_transactions
        WHERE type='credit' AND date(created_at) = ${dateExpr}
      `).get().s || 0;
      const debits = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) AS s FROM wallet_transactions
        WHERE type='debit' AND date(created_at) = ${dateExpr}
      `).get().s || 0;

      const dateRow = db.prepare(`SELECT ${dateExpr} AS d`).get().d;

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

  transferToUser(req, res) {
    const { to_user_id, amount, description } = req.body;
    if (!to_user_id || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'to_user_id and positive amount are required' });
    }
    const target = UserModel.findById(parseInt(to_user_id));
    if (!target) return res.status(404).json({ error: 'Target user not found' });
    if (target.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot transfer to yourself' });
    }
    if (target.status !== 'active') {
      return res.status(400).json({ error: 'Target user is not active' });
    }

    const amt = parseFloat(amount);
    try {
      const txn = db.transaction(() => {
        WalletModel.debit(req.user.id, amt, 'wallet_transfer', target.id, description || `Transfer to ${target.name}`);
        WalletModel.credit(target.id, amt, 'wallet_transfer', req.user.id, description || `Transfer from admin`);
      });
      txn();
      const adminWallet = WalletModel.getByUserId(req.user.id);
      res.json({ message: 'Transfer successful', balance: adminWallet ? adminWallet.balance : 0 });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  getWalletTransactions(req, res) {
    const { page = 1, limit = 20, type, user_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE 1=1';
    const params = [];
    if (type) { where += ' AND wt.type = ?'; params.push(type); }
    if (user_id) { where += ' AND wt.user_id = ?'; params.push(parseInt(user_id)); }

    const transactions = db.prepare(`
      SELECT wt.*, u.name as user_name, u.phone as user_phone, u.role as user_role
      FROM wallet_transactions wt JOIN users u ON wt.user_id = u.id
      ${where} ORDER BY wt.id DESC LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);
    const total = db.prepare(`SELECT COUNT(*) as count FROM wallet_transactions wt ${where}`).get(...params).count;
    res.json({ transactions, total, page: parseInt(page), limit: parseInt(limit) });
  },

  platformFees(req, res) {
    // Slice 3: this endpoint now reads from commission_splits (the new
    // 0.25% / 0.5% override model). The legacy `platform_fees` table is
    // kept for historical top-up fee data and is no longer written by the
    // recharge path. Razorpay top-ups still use platform_fees because the
    // user only changed retailer commission economics — top-up fees are
    // a separate revenue line.
    const { page = 1, limit = 50, from, to } = req.query;
    const list = CommissionSplitModel.list({ page: parseInt(page), limit: parseInt(limit), from, to });
    const totals = CommissionSplitModel.totals();
    const config = CommissionSplitModel.getSplitConfig();
    // Legacy top-up fee history (kept for the same page, separate section).
    const topupTotals = PlatformFeeModel.totals();
    res.json({
      ...list,
      totals,
      config,
      topupTotals,
    });
  },
};

module.exports = AdminController;

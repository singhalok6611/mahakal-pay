const bcrypt = require('bcryptjs');
const UserModel = require('../models/user.model');
const WalletModel = require('../models/wallet.model');
const TransactionModel = require('../models/transaction.model');
const PlatformFeeModel = require('../models/platformFee.model');
const { isValidPan, normalizePan } = require('../utils/pan');
const db = require('../config/db');

const AdminController = {
  dashboard(req, res) {
    const rechargeStats = TransactionModel.getTodayStats();
    const userCounts = UserModel.countByRole();
    const distBalance = WalletModel.getTotalBalanceByRole('distributor');
    const retailerBalance = WalletModel.getTotalBalanceByRole('retailer');
    const todayCommission = TransactionModel.getTodayCommission();

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

    res.status(201).json({ message: 'Distributor created', user });
  },

  listUsers(req, res) {
    const { role, page = 1, limit = 20 } = req.query;
    if (role) {
      const result = UserModel.listByRole(role, parseInt(page), parseInt(limit));
      return res.json(result);
    }
    // List all non-admin users
    const distributors = UserModel.listByRole('distributor', 1, 1000);
    const retailers = UserModel.listByRole('retailer', 1, 1000);
    res.json({
      users: [...distributors.users, ...retailers.users],
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
    const { page = 1, limit = 20, status, service_type } = req.query;
    const result = TransactionModel.listAll(parseInt(page), parseInt(limit), { status, service_type });
    res.json(result);
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
    res.json({ message: 'Retailer approved', user: updated });
  },

  rejectRetailer(req, res) {
    const id = parseInt(req.params.id);
    const user = UserModel.findById(id);
    if (!user || user.role !== 'retailer') {
      return res.status(404).json({ error: 'Retailer not found' });
    }
    const updated = UserModel.setApprovalStatus(id, 'rejected');
    res.json({ message: 'Retailer rejected', user: updated });
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
    const { page = 1, limit = 50, from, to } = req.query;
    const list = PlatformFeeModel.list({ page: parseInt(page), limit: parseInt(limit), from, to });
    const totals = PlatformFeeModel.totals();
    res.json({ ...list, totals, feePct: PlatformFeeModel.getFeePct() });
  },
};

module.exports = AdminController;

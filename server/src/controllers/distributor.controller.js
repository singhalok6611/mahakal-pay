const bcrypt = require('bcryptjs');
const UserModel = require('../models/user.model');
const WalletModel = require('../models/wallet.model');
const TransactionModel = require('../models/transaction.model');
const db = require('../config/db');

const DistributorController = {
  dashboard(req, res) {
    const rechargeStats = TransactionModel.getTodayStats({ field: 'parent_id', value: req.user.id });
    const retailers = UserModel.listByParent(req.user.id, 1, 1000);
    const wallet = WalletModel.getByUserId(req.user.id);

    let retailerBalance = 0;
    for (const r of retailers.users) {
      const w = WalletModel.getByUserId(r.id);
      if (w) retailerBalance += w.balance;
    }

    res.json({
      recharge: rechargeStats,
      retailers: {
        count: retailers.total,
        balance: retailerBalance,
      },
      wallet: {
        balance: wallet ? wallet.balance : 0,
      },
    });
  },

  listRetailers(req, res) {
    const { page = 1, limit = 20 } = req.query;
    const result = UserModel.listByParent(req.user.id, parseInt(page), parseInt(limit));

    // Add wallet balance for each retailer
    result.users = result.users.map(user => {
      const wallet = WalletModel.getByUserId(user.id);
      return { ...user, balance: wallet ? wallet.balance : 0 };
    });

    res.json(result);
  },

  createRetailer(req, res) {
    const { name, email, phone, password, shop_name, address, city, state, pincode } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'Name, email, phone and password are required' });
    }

    if (UserModel.findByEmail(email)) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    if (UserModel.findByPhone(phone)) {
      return res.status(400).json({ error: 'Phone already exists' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const user = UserModel.create({
      parent_id: req.user.id,
      role: 'retailer',
      name, email, phone, password_hash, shop_name, address, city, state, pincode,
    });

    res.status(201).json({ message: 'Retailer created', user });
  },

  updateRetailer(req, res) {
    const { id } = req.params;
    const user = UserModel.findById(parseInt(id));

    if (!user || user.parent_id !== req.user.id) {
      return res.status(404).json({ error: 'Retailer not found' });
    }

    const updated = UserModel.update(parseInt(id), req.body);
    res.json({ message: 'Retailer updated', user: updated });
  },

  getTransactions(req, res) {
    const { page = 1, limit = 20, status } = req.query;
    const result = TransactionModel.listByParentUser(req.user.id, parseInt(page), parseInt(limit), { status });
    res.json(result);
  },

  transferBalance(req, res) {
    const { retailer_id, amount } = req.body;
    if (!retailer_id || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid retailer ID and amount required' });
    }

    const retailer = UserModel.findById(parseInt(retailer_id));
    if (!retailer || retailer.parent_id !== req.user.id) {
      return res.status(404).json({ error: 'Retailer not found' });
    }

    try {
      WalletModel.debit(req.user.id, parseFloat(amount), 'fund_transfer', null, `Transfer to ${retailer.name}`);
      WalletModel.credit(parseInt(retailer_id), parseFloat(amount), 'fund_transfer', null, `Transfer from distributor`);

      const wallet = WalletModel.getByUserId(req.user.id);
      res.json({ message: 'Balance transferred', balance: wallet.balance });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  createSupportTicket(req, res) {
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    db.prepare('INSERT INTO support_tickets (user_id, subject, message) VALUES (?, ?, ?)')
      .run(req.user.id, subject, message);

    res.status(201).json({ message: 'Support ticket created' });
  },
};

module.exports = DistributorController;

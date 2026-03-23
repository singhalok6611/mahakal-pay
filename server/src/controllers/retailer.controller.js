const WalletModel = require('../models/wallet.model');
const TransactionModel = require('../models/transaction.model');
const db = require('../config/db');

const RetailerController = {
  dashboard(req, res) {
    const wallet = WalletModel.getByUserId(req.user.id);
    const recentTxns = TransactionModel.listByUser(req.user.id, 1, 10);
    const todayStats = TransactionModel.getTodayStats({ field: 'id', value: req.user.id });

    res.json({
      balance: wallet ? wallet.balance : 0,
      recharge: todayStats,
      recentTransactions: recentTxns.transactions,
    });
  },

  getWallet(req, res) {
    const wallet = WalletModel.getByUserId(req.user.id);
    res.json({ balance: wallet ? wallet.balance : 0 });
  },

  getTransactions(req, res) {
    const { page = 1, limit = 20, status, service_type } = req.query;
    const result = TransactionModel.listByUser(req.user.id, parseInt(page), parseInt(limit), { status, service_type });
    res.json(result);
  },

  recharge(req, res) {
    const { service_type, operator, subscriber_id, amount } = req.body;

    if (!service_type || !operator || !subscriber_id || !amount) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const validTypes = ['mobile', 'fastag', 'dth'];
    if (!validTypes.includes(service_type)) {
      return res.status(400).json({ error: 'Invalid service type' });
    }

    const parsedAmount = parseFloat(amount);
    if (parsedAmount < 10 || parsedAmount > 10000) {
      return res.status(400).json({ error: 'Amount must be between 10 and 10000' });
    }

    // Check operator exists
    const op = db.prepare('SELECT * FROM operators WHERE code = ? AND service_type = ? AND status = ?').get(operator, service_type, 'active');
    if (!op) {
      return res.status(400).json({ error: 'Invalid operator' });
    }

    try {
      // Debit wallet
      WalletModel.debit(req.user.id, parsedAmount, 'recharge', null, `${service_type} recharge - ${subscriber_id}`);

      // Calculate commission
      const commission = (parsedAmount * op.commission_pct) / 100;

      // Create transaction
      const txn = TransactionModel.create({
        user_id: req.user.id,
        service_type,
        operator: op.name,
        subscriber_id,
        amount: parsedAmount,
        status: 'success', // Simulated - in production this would be 'processing' until API callback
        commission,
      });

      // Credit commission back to retailer
      if (commission > 0) {
        WalletModel.credit(req.user.id, commission, 'commission', txn.id, `Commission for ${service_type} recharge`);
      }

      const wallet = WalletModel.getByUserId(req.user.id);
      res.json({
        message: 'Recharge successful',
        transaction: txn,
        balance: wallet.balance,
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  getOperators(req, res) {
    const { service_type } = req.query;
    let operators;
    if (service_type) {
      operators = db.prepare("SELECT * FROM operators WHERE service_type = ? AND status = 'active'").all(service_type);
    } else {
      operators = db.prepare("SELECT * FROM operators WHERE status = 'active'").all();
    }
    res.json(operators);
  },

  createPaymentRequest(req, res) {
    const { amount, payment_mode, reference_no, bank_name } = req.body;
    if (!amount || !payment_mode) {
      return res.status(400).json({ error: 'Amount and payment mode required' });
    }

    db.prepare(`
      INSERT INTO payment_requests (user_id, amount, payment_mode, reference_no, bank_name)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, parseFloat(amount), payment_mode, reference_no, bank_name);

    res.status(201).json({ message: 'Payment request submitted' });
  },

  createSupportTicket(req, res) {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message required' });
    }

    db.prepare('INSERT INTO support_tickets (user_id, subject, message) VALUES (?, ?, ?)')
      .run(req.user.id, subject, message);

    res.status(201).json({ message: 'Support ticket created' });
  },

  getWalletTransactions(req, res) {
    const { page = 1, limit = 20 } = req.query;
    const result = WalletModel.getTransactions(req.user.id, parseInt(page), parseInt(limit));
    res.json(result);
  },
};

module.exports = RetailerController;

const WalletModel = require('../models/wallet.model');
const TransactionModel = require('../models/transaction.model');
const CommissionSplitModel = require('../models/commissionSplit.model');
const CyrusService = require('../services/cyrus.service');
const { shapeRows } = require('../utils/txnVisibility');
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

  // Slice 6: detailed feed scoped to this retailer's own transactions only.
  // Strips both admin_share_* AND distributor_share_* / distributor_* per
  // the visibility rule — a retailer must not see anything above their own
  // line in the hierarchy.
  getDetailedTransactions(req, res) {
    const { page = 1, limit = 20, status, service_type } = req.query;
    const result = TransactionModel.listDetailed({
      scope: 'retailer',
      scopeUserId: req.user.id,
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      service_type,
    });
    res.json({
      ...result,
      rows: shapeRows(result.rows, 'retailer'),
      role: 'retailer',
    });
  },

  async recharge(req, res) {
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

    let txn;
    try {
      // 1) Debit wallet up-front
      WalletModel.debit(req.user.id, parsedAmount, 'recharge', null, `${service_type} recharge - ${subscriber_id}`);

      // 2) Create transaction in 'processing' state
      txn = TransactionModel.create({
        user_id: req.user.id,
        service_type,
        operator: op.name,
        subscriber_id,
        amount: parsedAmount,
        status: 'processing',
        commission: 0,
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    // 3) Call Cyrus (or mock)
    let cyrusResult;
    try {
      cyrusResult = await CyrusService.recharge({
        transactionId: txn.id,
        operatorCode: op.code,
        number: subscriber_id,
        amount: parsedAmount,
      });
    } catch (err) {
      cyrusResult = { status: 'failed', message: err.message, apiTxnId: null };
    }

    // 4) Update transaction status from API result
    TransactionModel.updateStatus(txn.id, cyrusResult.status, cyrusResult.apiTxnId);

    if (cyrusResult.status === 'failed') {
      // Refund the wallet — recharge didn't go through
      WalletModel.credit(req.user.id, parsedAmount, 'refund', txn.id, `Refund for failed recharge #${txn.id}`);
      const wallet = WalletModel.getByUserId(req.user.id);
      return res.status(400).json({
        error: cyrusResult.message || 'Recharge failed',
        transaction: TransactionModel.findById(txn.id),
        balance: wallet ? wallet.balance : 0,
      });
    }

    // 5) On success: pay commission to retailer, then split the upline overrides
    //    (slice 3 — replaces the old flat "1% platform fee to admin" model).
    if (cyrusResult.status === 'success') {
      const commission = Math.round(((parsedAmount * op.commission_pct) / 100) * 100) / 100;
      if (commission > 0) {
        WalletModel.credit(req.user.id, commission, 'commission', txn.id, `Commission for ${service_type} recharge`);
        db.prepare('UPDATE transactions SET commission = ? WHERE id = ?').run(commission, txn.id);
      }
      // Override credits land in distributor + admin wallets and create one
      // commission_splits row (used by the admin earnings page + slice 6
      // role-scoped txn views). The split is computed off the RETAILER's
      // commission, never the recharge amount.
      try {
        CommissionSplitModel.apply({
          transactionId: txn.id,
          retailerUserId: req.user.id,
          retailerCommission: commission,
        });
      } catch (err) {
        // Don't fail the recharge if the override accounting blows up — just log it.
        console.error('[recharge] commission split failed:', err.message);
      }
    }

    const wallet = WalletModel.getByUserId(req.user.id);
    res.json({
      message: cyrusResult.status === 'success' ? 'Recharge successful' : 'Recharge processing',
      transaction: TransactionModel.findById(txn.id),
      balance: wallet.balance,
    });
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

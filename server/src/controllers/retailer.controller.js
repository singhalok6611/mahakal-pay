const WalletModel = require('../models/wallet.model');
const TransactionModel = require('../models/transaction.model');
const CommissionSplitModel = require('../models/commissionSplit.model');
const WithdrawalModel = require('../models/withdrawal.model');
const UserModel = require('../models/user.model');
const Pay2AllService = require('../services/pay2all.service');
const notify = require('../services/notify.service');
const { shapeRows } = require('../utils/txnVisibility');
const { validateWithdrawalPayload } = require('../utils/withdrawal');
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

    // 3) Call upstream provider. Pay2All is the chosen production
    //    provider per project_mahakal_commission memory; the service
    //    has its own mock-fallback when PAY2ALL_* env vars aren't set,
    //    so dev/CI keep working without real credentials.
    let cyrusResult; // var name kept for downstream compat — it now holds the provider's response shape
    try {
      cyrusResult = await Pay2AllService.recharge({
        transactionId: txn.id,
        operatorCode: op.code,
        number: subscriber_id,
        amount: parsedAmount,
      });
    } catch (err) {
      cyrusResult = { status: 'failed', message: err.message, apiTxnId: null };
    }

    // If Pay2All explicitly returned "Insufficient balance" we know the
    // float ran out — fire a low-float notification to admin so the
    // problem is visible (debounced inside notify.service.lowFloat).
    if (cyrusResult.status === 'failed' && /insufficient/i.test(cyrusResult.message || '')) {
      try {
        const balResult = await Pay2AllService.checkBalance();
        const internalTotal = Number(
          db.prepare('SELECT COALESCE(SUM(balance), 0) AS s FROM wallets').get().s || 0
        );
        const pay2allBalance = Number(balResult.balance ?? 0);
        const coveragePct = internalTotal > 0 ? (pay2allBalance / internalTotal) * 100 : 100;
        notify.lowFloat({
          pay2allBalance,
          internalTotal,
          coveragePct,
          deltaInr: pay2allBalance - internalTotal,
        });
      } catch (e) {
        console.error('[recharge] low-float notify failed:', e.message);
      }
    }

    // 4) Update transaction status from API result
    TransactionModel.updateStatus(txn.id, cyrusResult.status, cyrusResult.apiTxnId);

    if (cyrusResult.status === 'failed') {
      // Refund the wallet — recharge didn't go through
      WalletModel.credit(req.user.id, parsedAmount, 'refund', txn.id, `Refund for failed recharge #${txn.id}`);
      notify.recharge({
        retailerName: req.user.name, retailerId: req.user.id, txnId: txn.id,
        amount: parsedAmount, status: 'failed',
        service: service_type, operator: op.name, subscriberId: subscriber_id,
      });
      const wallet = WalletModel.getByUserId(req.user.id);
      return res.status(400).json({
        error: cyrusResult.message || 'Recharge failed',
        transaction: TransactionModel.findById(txn.id),
        balance: wallet ? wallet.balance : 0,
      });
    }

    // 5) On success: split the operator commission three ways and credit
    //    each wallet. The CommissionSplit model is the single source of
    //    truth — it computes admin (0.5pp), distributor (0.25pp) and
    //    retailer (operator% − 0.75pp) cuts off the recharge amount,
    //    handles the cascading cap for thin operators, credits all three
    //    wallets, and inserts one commission_splits row.
    if (cyrusResult.status === 'success') {
      try {
        const split = CommissionSplitModel.apply({
          transactionId: txn.id,
          retailerUserId: req.user.id,
          rechargeAmount: parsedAmount,
          operatorCommissionPct: op.commission_pct,
        });
        // transactions.commission stores the retailer's NET take (what
        // they actually keep after upline cuts). Slice 6 detailed pages
        // and the dashboard rollups read this column.
        db.prepare('UPDATE transactions SET commission = ? WHERE id = ?')
          .run(split.retailerAmount, txn.id);
      } catch (err) {
        // Don't fail the recharge if the split blows up — just log it.
        console.error('[recharge] commission split failed:', err.message);
      }
      notify.recharge({
        retailerName: req.user.name, retailerId: req.user.id, txnId: txn.id,
        amount: parsedAmount, status: 'success',
        service: service_type, operator: op.name, subscriberId: subscriber_id,
      });
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

  // ---------- Slice 4: Withdrawals (own) ----------

  createWithdrawal(req, res) {
    const { error, payload } = validateWithdrawalPayload(req.body);
    if (error) return res.status(400).json({ error });

    const wallet = WalletModel.getByUserId(req.user.id);
    if (!wallet || wallet.balance < payload.amount) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }
    const w = WithdrawalModel.create({ user_id: req.user.id, ...payload });
    notify.withdrawalCreated({
      userName: req.user.name, userId: req.user.id, userEmail: req.user.email,
      withdrawalId: w.id, amount: payload.amount, method: payload.method,
    });
    res.status(201).json({ message: 'Withdrawal request submitted', withdrawal: w });
  },

  listWithdrawals(req, res) {
    const { page = 1, limit = 20 } = req.query;
    const result = WithdrawalModel.listByUser(req.user.id, { page: parseInt(page), limit: parseInt(limit) });
    res.json(result);
  },

  // ---------- Slice 4: Wallet → wallet (retailer transfers up to their distributor) ----------
  //
  // The only peer transfer a retailer can make is back up to their parent
  // distributor — they cannot fund another retailer directly. This keeps
  // the money flow tree-shaped (admin -> dist -> retailer) with one
  // sanctioned reverse path.

  transferToParent(req, res) {
    const { amount, description } = req.body;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      return res.status(400).json({ error: 'A positive amount is required' });
    }
    const me = UserModel.findById(req.user.id);
    if (!me || !me.parent_id) {
      return res.status(400).json({ error: 'You are not linked to a distributor' });
    }
    const parent = UserModel.findById(me.parent_id);
    if (!parent || parent.role !== 'distributor' || parent.status !== 'active') {
      return res.status(400).json({ error: 'Your distributor is not currently active' });
    }
    try {
      const txn = db.transaction(() => {
        WalletModel.debit(req.user.id, amt, 'wallet_transfer', parent.id, description || `Transfer to distributor ${parent.name}`);
        WalletModel.credit(parent.id, amt, 'wallet_transfer', req.user.id, description || `Transfer from retailer ${me.name}`);
      });
      txn();
      notify.walletTransfer({
        fromName: me.name, fromId: me.id,
        toName: parent.name, toId: parent.id,
        amount: amt, direction: 'transferred up to distributor',
      });
      const wallet = WalletModel.getByUserId(req.user.id);
      res.json({ message: 'Transfer successful', balance: wallet ? wallet.balance : 0 });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
};

module.exports = RetailerController;

const db = require('../config/db');
const RazorpayService = require('../services/razorpay.service');
const WalletModel = require('../models/wallet.model');
const PlatformFeeModel = require('../models/platformFee.model');

const MIN_AMOUNT = parseFloat(process.env.MIN_TOPUP_AMOUNT || '100');
const MAX_AMOUNT = parseFloat(process.env.MAX_TOPUP_AMOUNT || '100000');

const PaymentController = {
  /**
   * GET /payment/config
   * Returns Razorpay public key + min/max topup so frontend can render checkout.
   */
  config(req, res) {
    res.json({
      configured: RazorpayService.isConfigured(),
      keyId: RazorpayService.getPublicKey(),
      currency: 'INR',
      min: MIN_AMOUNT,
      max: MAX_AMOUNT,
      platformFeePct: PlatformFeeModel.getFeePct(),
    });
  },

  /**
   * POST /payment/create-order
   * body: { amount }
   * Creates a Razorpay order, stores it locally, returns order id + key for checkout.
   */
  async createOrder(req, res) {
    try {
      const amount = parseFloat(req.body.amount);
      if (!amount || isNaN(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
        return res.status(400).json({
          error: `Amount must be between ₹${MIN_AMOUNT} and ₹${MAX_AMOUNT}`,
        });
      }

      if (!RazorpayService.isConfigured()) {
        return res.status(503).json({ error: 'Payment gateway not configured' });
      }

      const order = await RazorpayService.createOrder({
        amount,
        receipt: `user_${req.user.id}_${Date.now()}`,
        notes: { user_id: String(req.user.id), purpose: 'wallet_topup' },
      });

      db.prepare(`
        INSERT INTO payment_orders (user_id, gateway, gateway_order_id, amount, currency, status)
        VALUES (?, 'razorpay', ?, ?, ?, 'created')
      `).run(req.user.id, order.id, amount, order.currency || 'INR');

      res.json({
        orderId: order.id,
        amount: order.amount, // paise
        currency: order.currency,
        keyId: RazorpayService.getPublicKey(),
        user: {
          name: req.user.name,
          email: req.user.email,
          contact: req.user.phone,
        },
      });
    } catch (err) {
      console.error('[payment.createOrder]', err);
      res.status(500).json({ error: err.message || 'Failed to create order' });
    }
  },

  /**
   * POST /payment/verify
   * body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
   * Verifies signature, credits user's wallet (after 1% platform fee), marks order paid.
   */
  verifyPayment(req, res) {
    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ error: 'Missing payment verification fields' });
    }

    const ok = RazorpayService.verifyPaymentSignature({ orderId, paymentId, signature });
    if (!ok) {
      db.prepare(`UPDATE payment_orders SET status = 'failed', error_description = 'signature_mismatch', updated_at = CURRENT_TIMESTAMP WHERE gateway_order_id = ?`).run(orderId);
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const order = db.prepare('SELECT * FROM payment_orders WHERE gateway_order_id = ?').get(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.user_id !== req.user.id) return res.status(403).json({ error: 'Order does not belong to you' });
    if (order.status === 'paid') {
      return res.json({ message: 'Already credited', status: 'paid' });
    }

    const txn = db.transaction(() => {
      db.prepare(`
        UPDATE payment_orders
        SET status = 'paid', gateway_payment_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(paymentId, order.id);

      // Apply 1% platform fee FIRST: deduct from gross, credit admin
      const { feeAmount, feePct } = PlatformFeeModel.apply({
        userId: order.user_id,
        sourceType: 'wallet_topup',
        sourceId: order.id,
        baseAmount: order.amount,
      });

      const netCredit = Math.round((order.amount - feeAmount) * 100) / 100;
      WalletModel.credit(
        order.user_id,
        netCredit,
        'wallet_topup',
        order.id,
        `Razorpay top-up ₹${order.amount} (₹${feeAmount} platform fee @ ${feePct}%)`
      );
      return { netCredit, feeAmount, feePct };
    });

    try {
      const result = txn();
      const wallet = WalletModel.getByUserId(req.user.id);
      res.json({
        message: 'Payment verified and wallet credited',
        status: 'paid',
        credited: result.netCredit,
        platformFee: result.feeAmount,
        balance: wallet ? wallet.balance : 0,
      });
    } catch (err) {
      console.error('[payment.verifyPayment]', err);
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * POST /payment/webhook
   * Razorpay webhook handler — server-to-server confirmation.
   * Configure URL in Razorpay dashboard. Use raw body for signature verification.
   */
  webhook(req, res) {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    if (!signature || !RazorpayService.verifyWebhookSignature({ rawBody, signature })) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload || {};

    try {
      if (event === 'payment.captured') {
        const payment = payload.payment?.entity;
        if (payment && payment.order_id) {
          const order = db.prepare('SELECT * FROM payment_orders WHERE gateway_order_id = ?').get(payment.order_id);
          if (order && order.status !== 'paid') {
            const txn = db.transaction(() => {
              db.prepare(`UPDATE payment_orders SET status='paid', gateway_payment_id=?, method=?, raw_payload=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
                .run(payment.id, payment.method || null, JSON.stringify(payment), order.id);

              const { feeAmount, feePct } = PlatformFeeModel.apply({
                userId: order.user_id,
                sourceType: 'wallet_topup',
                sourceId: order.id,
                baseAmount: order.amount,
              });
              const netCredit = Math.round((order.amount - feeAmount) * 100) / 100;
              WalletModel.credit(
                order.user_id,
                netCredit,
                'wallet_topup',
                order.id,
                `Razorpay webhook ₹${order.amount} (fee ₹${feeAmount} @ ${feePct}%)`
              );
            });
            txn();
          }
        }
      } else if (event === 'payment.failed') {
        const payment = payload.payment?.entity;
        if (payment && payment.order_id) {
          db.prepare(`UPDATE payment_orders SET status='failed', error_code=?, error_description=?, raw_payload=?, updated_at=CURRENT_TIMESTAMP WHERE gateway_order_id=?`)
            .run(payment.error_code || null, payment.error_description || null, JSON.stringify(payment), payment.order_id);
        }
      }
      res.json({ ok: true });
    } catch (err) {
      console.error('[payment.webhook]', err);
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * GET /payment/orders — user's own top-up history
   */
  myOrders(req, res) {
    const orders = db.prepare(`
      SELECT id, gateway, gateway_order_id, gateway_payment_id, amount, currency, status, method, created_at
      FROM payment_orders WHERE user_id = ? ORDER BY id DESC LIMIT 50
    `).all(req.user.id);
    res.json({ orders });
  },
};

module.exports = PaymentController;

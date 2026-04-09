const crypto = require('crypto');

let Razorpay;
try {
  Razorpay = require('razorpay');
} catch (e) {
  console.warn('[razorpay.service] razorpay package not installed; running in stub mode');
}

const KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

let instance = null;
function client() {
  if (!Razorpay) throw new Error('Razorpay SDK not installed');
  if (!KEY_ID || !KEY_SECRET) {
    throw new Error('Razorpay keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
  }
  if (!instance) {
    instance = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
  }
  return instance;
}

const RazorpayService = {
  isConfigured() {
    return !!(Razorpay && KEY_ID && KEY_SECRET);
  },

  getPublicKey() {
    return KEY_ID;
  },

  /**
   * Create an order at Razorpay. Amount is in INR rupees (we convert to paise).
   */
  async createOrder({ amount, currency = 'INR', receipt, notes }) {
    const order = await client().orders.create({
      amount: Math.round(amount * 100), // paise
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: notes || {},
    });
    return order;
  },

  /**
   * Verify the signature returned by Razorpay Checkout after a successful payment.
   * orderId + paymentId + signature → expected signature = HMAC_SHA256(orderId|paymentId, KEY_SECRET)
   */
  verifyPaymentSignature({ orderId, paymentId, signature }) {
    if (!KEY_SECRET) throw new Error('Razorpay secret not configured');
    const expected = crypto
      .createHmac('sha256', KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    // Constant-time compare
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  },

  /**
   * Verify webhook signature header `x-razorpay-signature`.
   */
  verifyWebhookSignature({ rawBody, signature }) {
    if (!WEBHOOK_SECRET) {
      console.warn('[razorpay.service] RAZORPAY_WEBHOOK_SECRET not set, skipping verification');
      return false;
    }
    const expected = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  },

  async fetchPayment(paymentId) {
    return client().payments.fetch(paymentId);
  },
};

module.exports = RazorpayService;

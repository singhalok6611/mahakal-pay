const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth');

router.get('/config', PaymentController.config);
router.post('/create-order', authenticate, PaymentController.createOrder);
router.post('/verify', authenticate, PaymentController.verifyPayment);
router.get('/orders', authenticate, PaymentController.myOrders);

// Webhook is public (Razorpay → server). Signature is verified inside.
router.post('/webhook', PaymentController.webhook);

module.exports = router;

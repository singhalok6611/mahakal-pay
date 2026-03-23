const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const RetailerController = require('../controllers/retailer.controller');

router.use(authenticate, requireRole('retailer'));

router.get('/dashboard', RetailerController.dashboard);
router.get('/wallet', RetailerController.getWallet);
router.get('/wallet/transactions', RetailerController.getWalletTransactions);
router.get('/transactions', RetailerController.getTransactions);
router.post('/recharge', RetailerController.recharge);
router.get('/operators', RetailerController.getOperators);
router.post('/payment-request', RetailerController.createPaymentRequest);
router.post('/support-ticket', RetailerController.createSupportTicket);

module.exports = router;

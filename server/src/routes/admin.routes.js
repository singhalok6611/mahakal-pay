const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const AdminController = require('../controllers/admin.controller');

router.use(authenticate, requireRole('admin'));

router.get('/dashboard', AdminController.dashboard);
router.get('/users', AdminController.listUsers);
router.post('/users/distributor', AdminController.createDistributor);
router.put('/users/:id', AdminController.updateUser);
router.get('/transactions', AdminController.getTransactions);
router.get('/kyc-requests', AdminController.listKYC);
router.put('/kyc-requests/:id', AdminController.updateKYC);
router.get('/payment-requests', AdminController.listPaymentRequests);
router.put('/payment-requests/:id', AdminController.updatePaymentRequest);
router.post('/wallet/credit', AdminController.creditWallet);
router.get('/support-tickets', AdminController.listSupportTickets);
router.put('/support-tickets/:id', AdminController.updateSupportTicket);
router.get('/settings', AdminController.getSettings);
router.put('/settings', AdminController.updateSettings);
router.post('/users/retailer', AdminController.createRetailer);
router.get('/wallet-transactions', AdminController.getWalletTransactions);
router.get('/platform-fees', AdminController.platformFees);

module.exports = router;

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
router.get('/transactions/detailed', AdminController.getDetailedTransactions);
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

// Retailer approval queue
router.get('/retailer-approvals', AdminController.listPendingRetailers);
router.put('/retailer-approvals/:id/approve', AdminController.approveRetailer);
router.put('/retailer-approvals/:id/reject', AdminController.rejectRetailer);

// Slice 4: withdrawals (admin queue)
router.get('/withdrawals', AdminController.listWithdrawals);
router.put('/withdrawals/:id/approve', AdminController.approveWithdrawal);
router.put('/withdrawals/:id/reject', AdminController.rejectWithdrawal);

// Slice 4: suspension with wallet sweep
router.put('/users/:id/suspend', AdminController.suspendUser);
router.put('/users/:id/reactivate', AdminController.reactivateUser);

// Slice 4: admin → any user wallet transfer
router.post('/wallet/transfer', AdminController.transferToUser);

module.exports = router;

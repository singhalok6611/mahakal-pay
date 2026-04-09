const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const DistributorController = require('../controllers/distributor.controller');

router.use(authenticate, requireRole('distributor'));

router.get('/dashboard', DistributorController.dashboard);
router.get('/retailers', DistributorController.listRetailers);
router.post('/retailers', DistributorController.createRetailer);
router.put('/retailers/:id', DistributorController.updateRetailer);
router.get('/transactions', DistributorController.getTransactions);
router.get('/transactions/detailed', DistributorController.getDetailedTransactions);
router.post('/wallet/transfer', DistributorController.transferBalance);
// Slice 4: own withdrawals
router.post('/withdrawals', DistributorController.createWithdrawal);
router.get('/withdrawals', DistributorController.listWithdrawals);
router.post('/support-ticket', DistributorController.createSupportTicket);

module.exports = router;

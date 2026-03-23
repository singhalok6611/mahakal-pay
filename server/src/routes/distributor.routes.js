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
router.post('/wallet/transfer', DistributorController.transferBalance);
router.post('/support-ticket', DistributorController.createSupportTicket);

module.exports = router;

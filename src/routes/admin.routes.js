const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const withdrawalController = require('../controllers/withdrawal.controller');
const { authenticateAdmin, requireSuperAdmin } = require('../middleware/auth');

// Public routes (admin authentication)
router.post('/login', adminController.login);

// Protected routes (require admin authentication)
router.get('/stats/financial', authenticateAdmin, adminController.getFinancialStats);
router.get('/stats/dashboard', authenticateAdmin, adminController.getDashboardStats);
router.get('/cvs', authenticateAdmin, adminController.getAllCVs);
router.get('/partners', authenticateAdmin, adminController.getAllPartners);
router.post('/partners', authenticateAdmin, adminController.createPartner);
router.put('/partners/:id/status', authenticateAdmin, adminController.updatePartnerStatus);
router.get('/associates', authenticateAdmin, adminController.getAllAssociates);
router.put('/associates/:id/status', authenticateAdmin, adminController.updateAssociateStatus);
router.get('/finance/stats', authenticateAdmin, adminController.getFinanceStats);
router.get('/payments', authenticateAdmin, withdrawalController.getAllPayments);
router.get('/withdrawals', authenticateAdmin, withdrawalController.getWithdrawals);
router.put('/withdrawals/:id/status', authenticateAdmin, withdrawalController.updateWithdrawalStatus);

module.exports = router;

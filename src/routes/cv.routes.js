const express = require('express');
const router = express.Router();
const cvController = require('../controllers/cv.controller');
const { authenticatePartner, authenticateAdmin } = require('../middleware/auth');

// Public routes
router.post('/purchase', cvController.purchaseCV);

// Protected routes - Partners
router.get('/', authenticatePartner, cvController.getAllCVs);
router.get('/:id', authenticatePartner, cvController.getCVById);
router.post('/', authenticatePartner, cvController.createCV);
router.put('/:id', authenticatePartner, cvController.updateCV);
router.delete('/:id', authenticatePartner, cvController.deleteCV);

// Admin routes - Allow admins to access CVs
router.get('/admin/all', authenticateAdmin, cvController.getAllCVs);
router.get('/admin/:id', authenticateAdmin, cvController.getCVById);

module.exports = router;

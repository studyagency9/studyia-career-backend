const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller');
const { authenticateAdmin, requireSuperAdmin } = require('../middleware/auth');

// Routes protégées (nécessitent authentification admin)
router.get('/', authenticateAdmin, invoiceController.getAllInvoices);
router.get('/stats', authenticateAdmin, invoiceController.getInvoiceStats);
router.get('/export', authenticateAdmin, invoiceController.exportInvoices);
router.get('/:id', authenticateAdmin, invoiceController.getInvoiceById);

// Routes de gestion des factures
router.post('/', authenticateAdmin, invoiceController.createInvoice);
router.put('/:id', authenticateAdmin, invoiceController.updateInvoice);
router.put('/:id/status', authenticateAdmin, invoiceController.updateInvoiceStatus);

// Route de suppression (nécessite superadmin)
router.delete('/:id', authenticateAdmin, requireSuperAdmin, invoiceController.deleteInvoice);

module.exports = router;

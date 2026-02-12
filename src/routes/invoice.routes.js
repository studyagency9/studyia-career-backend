const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller');
const { authenticateAdmin, requireSuperAdmin } = require('../middleware/auth');
const multer = require('multer');
const { memoryStorage } = require('multer');

// Configuration multer pour stocker en mémoire
const upload = multer({
  storage: memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF sont autorisés'), false);
    }
  }
});

// Routes protégées (nécessitent authentification admin)
router.get('/', authenticateAdmin, invoiceController.getAllInvoices);
router.get('/stats', authenticateAdmin, invoiceController.getInvoiceStats);
router.get('/export', authenticateAdmin, invoiceController.exportInvoices);
router.get('/:id', authenticateAdmin, invoiceController.getInvoiceById);

// Routes de gestion des factures
router.post('/', authenticateAdmin, invoiceController.createInvoice);
router.put('/:id', authenticateAdmin, invoiceController.updateInvoice);
router.put('/:id/status', authenticateAdmin, invoiceController.updateInvoiceStatus);

// Routes PDF
router.post('/:id/upload-pdf', authenticateAdmin, upload.single('pdf'), invoiceController.uploadInvoicePDF);
router.get('/:id/download-pdf', authenticateAdmin, invoiceController.downloadInvoicePDF);
router.get('/:id/check-pdf', authenticateAdmin, invoiceController.checkPDFExists);
router.delete('/:id/pdf', authenticateAdmin, invoiceController.deleteInvoicePDF);

// Route de suppression (nécessite superadmin)
router.delete('/:id', authenticateAdmin, requireSuperAdmin, invoiceController.deleteInvoice);

module.exports = router;

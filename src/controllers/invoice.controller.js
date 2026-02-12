const Invoice = require('../models/mongodb').Invoice;
const CV = require('../models/mongodb').CV;
const Associate = require('../models/mongodb').Associate;
const Partner = require('../models/mongodb').Partner;
const Admin = require('../models/mongodb').Admin;

// Créer une facture
exports.createInvoice = async (req, res) => {
  try {
    const {
      clientId,
      clientType, // 'customer', 'associate', 'partner'
      items,
      subtotal,
      tax,
      total,
      dueDate,
      notes
    } = req.body;

    // Générer un numéro de facture unique
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const invoice = new Invoice({
      invoiceNumber,
      clientId,
      clientType,
      items,
      subtotal,
      tax,
      total,
      dueDate,
      notes,
      status: 'pending',
      createdAt: new Date(),
      createdBy: req.admin?.id || req.user?.id
    });

    await invoice.save();

    res.status(201).json({
      success: true,
      data: {
        invoice
      }
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while creating invoice'
    });
  }
};

// Lister toutes les factures
exports.getAllInvoices = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      clientType, 
      startDate, 
      endDate,
      search 
    } = req.query;

    // Construire le filtre
    const filter = {};
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (clientType && clientType !== 'all') {
      filter.clientType = clientType;
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'clientInfo.name': { $regex: search, $options: 'i' } },
        { 'clientInfo.email': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const invoices = await Invoice.find(filter)
      .select('invoiceNumber clientId clientType clientInfo items subtotal tax total dueDate status paidAt paymentDate paymentMethod notes createdAt updatedAt pdfUrl pdfVersion pdfData.size')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Invoice.countDocuments(filter);

    // Calculer les statistiques
    const stats = await Invoice.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$total' },
          paidAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$total', 0]
            }
          },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$total', 0]
            }
          },
          overdueAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'overdue'] }, '$total', 0]
            }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        invoices,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        stats: stats[0] || {
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          overdueAmount: 0
        }
      }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching invoices'
    });
  }
};

// Obtenir une facture par ID
exports.getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        invoice
      }
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching invoice'
    });
  }
};

// Mettre à jour une facture
exports.updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const invoice = await Invoice.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        invoice
      }
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating invoice'
    });
  }
};

// Mettre à jour le statut d'une facture
exports.updateInvoiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentDate, paymentMethod, notes } = req.body;

    const invoice = await Invoice.findByIdAndUpdate(
      id,
      {
        status,
        ...(status === 'paid' && {
          paidAt: new Date(),
          paymentDate: paymentDate || new Date(),
          paymentMethod
        }),
        notes,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        invoice
      }
    });
  } catch (error) {
    console.error('Update invoice status error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating invoice status'
    });
  }
};

// Supprimer une facture
exports.deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findByIdAndDelete(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while deleting invoice'
    });
  }
};

// Obtenir les statistiques des factures
exports.getInvoiceStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const stats = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: '$total' },
          paidInvoices: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
          },
          pendingInvoices: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          overdueInvoices: {
            $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] }
          },
          paidAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$total', 0]
            }
          },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$total', 0]
            }
          },
          overdueAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'overdue'] }, '$total', 0]
            }
          }
        }
      }
    ]);

    // Statistiques par type de client
    const clientTypeStats = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$clientType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' }
        }
      }
    ]);

    // Statistiques mensuelles
    const monthlyStats = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: stats[0] || {
          totalInvoices: 0,
          totalAmount: 0,
          paidInvoices: 0,
          pendingInvoices: 0,
          overdueInvoices: 0,
          paidAmount: 0,
          pendingAmount: 0,
          overdueAmount: 0
        },
        clientTypeStats,
        monthlyStats
      }
    });
  } catch (error) {
    console.error('Get invoice stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching invoice stats'
    });
  }
};

// Upload PDF depuis le frontend
exports.uploadInvoicePDF = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Aucun fichier PDF fourni'
      });
    }

    const invoice = await Invoice.findById(id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Facture non trouvée'
      });
    }

    // Sauvegarder le PDF dans la facture
    invoice.pdfData = {
      data: req.file.buffer,
      contentType: req.file.mimetype,
      size: req.file.size,
      filename: `invoice-${invoice.invoiceNumber}.pdf`,
      generatedAt: new Date()
    };
    
    invoice.pdfUrl = `/api/invoices/${id}/download-pdf`;
    invoice.pdfVersion += 1;
    
    await invoice.save();

    res.status(200).json({
      success: true,
      data: {
        message: 'PDF uploadé avec succès',
        pdfUrl: invoice.pdfUrl,
        pdfSize: req.file.size,
        pdfVersion: invoice.pdfVersion
      }
    });
  } catch (error) {
    console.error('Upload PDF error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while uploading PDF'
    });
  }
};

// Télécharger PDF
exports.downloadInvoicePDF = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Facture non trouvée'
      });
    }

    if (!invoice.pdfData || !invoice.pdfData.data) {
      return res.status(404).json({
        success: false,
        error: 'PDF non disponible pour cette facture'
      });
    }

    // Configurer les headers pour le téléchargement
    res.setHeader('Content-Type', invoice.pdfData.contentType);
    res.setHeader('Content-Length', invoice.pdfData.size);
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.pdfData.filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 24h

    // Envoyer les données du PDF
    res.send(invoice.pdfData.data);
  } catch (error) {
    console.error('Download PDF error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while downloading PDF'
    });
  }
};

// Vérifier si un PDF existe
exports.checkPDFExists = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id, 'pdfData pdfUrl pdfVersion');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Facture non trouvée'
      });
    }

    const hasPDF = !!(invoice.pdfData && invoice.pdfData.data);

    res.status(200).json({
      success: true,
      data: {
        hasPDF,
        pdfUrl: hasPDF ? invoice.pdfUrl : null,
        pdfSize: hasPDF ? invoice.pdfData.size : null,
        pdfVersion: invoice.pdfVersion,
        generatedAt: hasPDF ? invoice.pdfData.generatedAt : null
      }
    });
  } catch (error) {
    console.error('Check PDF error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while checking PDF'
    });
  }
};

// Supprimer PDF
exports.deleteInvoicePDF = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Facture non trouvée'
      });
    }

    // Supprimer les données PDF
    invoice.pdfData = undefined;
    invoice.pdfUrl = null;
    
    await invoice.save();

    res.status(200).json({
      success: true,
      message: 'PDF supprimé avec succès'
    });
  } catch (error) {
    console.error('Delete PDF error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while deleting PDF'
    });
  }
};

// Exporter les factures en CSV
exports.exportInvoices = async (req, res) => {
  try {
    const { status, clientType, startDate, endDate } = req.query;

    const filter = {};
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (clientType && clientType !== 'all') {
      filter.clientType = clientType;
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(filter).sort({ createdAt: -1 });

    // Générer le CSV
    const csvHeader = 'Invoice Number,Client Name,Client Email,Client Type,Amount,Tax,Total,Status,Due Date,Created Date\n';
    const csvData = invoices.map(invoice => 
      `"${invoice.invoiceNumber}","${invoice.clientInfo?.name || 'N/A'}","${invoice.clientInfo?.email || 'N/A'}","${invoice.clientType}","${invoice.subtotal}","${invoice.tax}","${invoice.total}","${invoice.status}","${invoice.dueDate}","${invoice.createdAt}"`
    ).join('\n');

    const csv = csvHeader + csvData;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="invoices-${new Date().toISOString().split('T')[0]}.csv"`);
    
    res.status(200).send(csv);
  } catch (error) {
    console.error('Export invoices error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while exporting invoices'
    });
  }
};

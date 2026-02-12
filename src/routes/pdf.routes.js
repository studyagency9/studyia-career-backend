const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Personnel } = require('../models');

// 🆕 Configuration Multer pour upload PDF
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/pdfs';
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Utiliser l'ID du PDF ou générer un nom unique
    const pdfId = req.body.pdfId || `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const filename = `${pdfId}.pdf`;
    req.pdfId = pdfId; // Sauvegarder pour la réponse
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF sont acceptés'), false);
    }
  }
});

// 🆕 Route d'upload PDF
router.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    console.log('🎯 DÉBUT - RÉCEPTION UPLOAD PDF');
    console.log('📋 INFOS REÇUES :');
    console.log(`   🆔 PDF ID: ${req.body.pdfId || 'Non fourni'}`);
    console.log(`   👤 Personnel ID: ${req.body.personnelId || 'Non fourni'}`);
    console.log(`   💰 Prix: ${req.body.price || 'Non fourni'} FCFA`);
    console.log(`   📊 Taille fichier: ${req.file ? req.file.size : '0'} bytes`);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Aucun fichier PDF fourni'
      });
    }
    
    // Construire l'URL publique du PDF
    const baseUrl = process.env.BASE_URL || 'https://studyiacareer-backend-qpmpz.ondigitalocean.app';
    const pdfUrl = `${baseUrl}/uploads/pdfs/${req.file.filename}`;
    
    console.log('✅ PDF reçu et sauvegardé !');
    console.log(`🔗 URL générée: ${pdfUrl}`);
    
    // Si personnelId est fourni, mettre à jour la fiche personnel
    if (req.body.personnelId) {
      try {
        await Personnel.findByIdAndUpdate(req.body.personnelId, {
          pdfUrl: pdfUrl
        });
        console.log(`👤 Personnel ${req.body.personnelId} mis à jour avec l'URL PDF`);
      } catch (personnelError) {
        console.error('❌ Erreur mise à jour personnel:', personnelError);
        // Ne pas bloquer la réponse si la mise à jour personnel échoue
      }
    }
    
    // Réponse succès
    const response = {
      success: true,
      message: 'PDF uploadé avec succès',
      data: {
        pdfId: req.pdfId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: pdfUrl,
        uploadedAt: new Date().toISOString()
      }
    };
    
    console.log('🎉 UPLOAD TERMINÉ AVEC SUCCÈS !');
    console.log('📊 RÉPONSE ENVOYÉE:', JSON.stringify(response.data, null, 2));
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ Erreur upload PDF:', error);
    
    // Nettoyer le fichier si erreur
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'upload du PDF',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

// 🆕 Route de vérification (optionnelle)
router.get('/verify/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join('uploads/pdfs', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'PDF non trouvé'
      });
    }
    
    const stats = fs.statSync(filePath);
    
    return res.status(200).json({
      success: true,
      data: {
        filename,
        size: stats.size,
        createdAt: stats.birthtime,
        accessible: true
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur vérification PDF:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification'
    });
  }
});

// 🆕 Route pour servir les PDFs (statique)
router.get('/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join('uploads/pdfs', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'PDF non trouvé'
      });
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    
    // Envoyer le fichier
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('❌ Erreur download PDF:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors du téléchargement'
    });
  }
});

module.exports = router;

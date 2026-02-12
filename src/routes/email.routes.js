const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const { 
  listEmails, 
  getEmail, 
  markEmail, 
  deleteEmail, 
  getMailboxStats,
  initImapService 
} = require('../services/imapService');

// Route principale pour lister les emails (admin seulement)
router.get('/emails', authenticateAdmin, async (req, res) => {
  try {
    const {
      limit = 20,
      offset = 0,
      folder = 'INBOX',
      unreadOnly = false,
      search = null
    } = req.query;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      folder,
      unreadOnly: unreadOnly === 'true',
      search: search || null
    };

    const result = await listEmails(options);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des emails:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des emails',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

// Route pour récupérer un email spécifique (admin seulement)
router.get('/emails/:uid', authenticateAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    
    if (!uid) {
      return res.status(400).json({
        success: false,
        error: 'UID de l\'email requis'
      });
    }

    const email = await getEmail(parseInt(uid));

    res.status(200).json({
      success: true,
      data: email
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'email:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'email',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

// Route pour marquer un email comme lu/non lu (admin seulement)
router.patch('/emails/:uid/read', authenticateAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const { read = true } = req.body;
    
    if (!uid) {
      return res.status(400).json({
        success: false,
        error: 'UID de l\'email requis'
      });
    }

    await markEmail(parseInt(uid), read);

    res.status(200).json({
      success: true,
      message: `Email marqué comme ${read ? 'lu' : 'non lu'} avec succès`
    });

  } catch (error) {
    console.error('❌ Erreur lors du marquage de l\'email:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du marquage de l\'email',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

// Route pour supprimer un email (admin seulement)
router.delete('/emails/:uid', authenticateAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    
    if (!uid) {
      return res.status(400).json({
        success: false,
        error: 'UID de l\'email requis'
      });
    }

    await deleteEmail(parseInt(uid));

    res.status(200).json({
      success: true,
      message: 'Email supprimé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur lors de la suppression de l\'email:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de l\'email',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

// Route pour obtenir les statistiques de la boîte mail (admin seulement)
router.get('/emails/stats', authenticateAdmin, async (req, res) => {
  try {
    const { folder = 'INBOX' } = req.query;
    
    const stats = await getMailboxStats(folder);

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

// Route de santé pour le service IMAP (admin seulement)
router.get('/emails/health', authenticateAdmin, async (req, res) => {
  try {
    const isConnected = await initImapService();
    
    res.status(200).json({
      success: true,
      data: {
        imapService: isConnected ? 'connected' : 'disconnected',
        imapHost: 'imap.hostinger.com',
        imapPort: 993,
        secure: true,
        user: 'contact@studyia.net'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Service IMAP indisponible',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

// Route pour tester la connexion IMAP (admin seulement)
router.post('/emails/test', authenticateAdmin, async (req, res) => {
  try {
    const { testFolder = 'INBOX' } = req.body;
    
    const stats = await getMailboxStats(testFolder);
    
    res.status(200).json({
      success: true,
      message: 'Connexion IMAP testée avec succès',
      data: stats
    });

  } catch (error) {
    console.error('❌ Erreur lors du test IMAP:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du test IMAP',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

module.exports = router;

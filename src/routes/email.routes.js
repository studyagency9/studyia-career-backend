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
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    console.log('🔍 DEBUG: Route /emails appelée');
    console.log('🔍 DEBUG: User authentifié:', !!req.user);
    
    const {
      limit = 20,
      offset = 0,
      folder = 'INBOX',
      unreadOnly = false,
      search = null
    } = req.query;

    console.log('🔍 DEBUG: Paramètres:', { limit, offset, folder, unreadOnly, search });

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      folder,
      unreadOnly: unreadOnly === 'true',
      search: search || null
    };

    console.log('🔍 DEBUG: Appel de listEmails...');
    const result = await listEmails(options);
    console.log('🔍 DEBUG: listEmails réussi, emails:', result.emails?.length);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Erreur route /emails:', error.message);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des emails',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

// Route pour récupérer un email spécifique (admin seulement)
router.get('/:uid', authenticateAdmin, async (req, res) => {
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
router.patch('/:uid/read', authenticateAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const { isRead = true } = req.body;
    
    if (!uid) {
      return res.status(400).json({
        success: false,
        error: 'UID de l\'email requis'
      });
    }

    await markEmail(parseInt(uid), isRead);

    res.status(200).json({
      success: true,
      message: `Email marqué comme ${isRead ? 'lu' : 'non lu'} avec succès`
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

// Route pour télécharger une pièce jointe (admin seulement)
router.get('/:uid/attachments/:filename', authenticateAdmin, async (req, res) => {
  try {
    const { uid, filename } = req.params;
    
    if (!uid || !filename) {
      return res.status(400).json({
        success: false,
        error: 'UID et nom de fichier requis'
      });
    }

    // Récupérer l'email avec pièces jointes
    const email = await getEmail(parseInt(uid));
    
    if (!email || !email.attachments || email.attachments.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Aucune pièce jointe trouvée pour cet email'
      });
    }

    // Chercher la pièce jointe demandée
    const attachment = email.attachments.find(att => 
      att.filename === decodeURIComponent(filename)
    );

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: 'Pièce jointe non trouvée'
      });
    }

    // Retourner la pièce jointe
    res.setHeader('Content-Type', attachment.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
    res.send(attachment.content);

  } catch (error) {
    console.error('❌ Erreur lors du téléchargement de la pièce jointe:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du téléchargement de la pièce jointe',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

// Route pour supprimer un email (admin seulement)
router.delete('/:uid', authenticateAdmin, async (req, res) => {
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
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const { folder = 'INBOX' } = req.query;
    
    // Importer le service IMAP pour les stats
    const imapService = require('../services/imapService');
    const stats = await imapService.getEmailStats();

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
router.get('/health', authenticateAdmin, async (req, res) => {
  try {
    console.log('🔍 DEBUG: Vérification santé IMAP...');
    
    // Vérifier si la variable d'environnement est configurée
    if (!process.env.MAIL_PASSWORD || process.env.MAIL_PASSWORD === 'VOTRE_MOT_DE_PASSE_ICI') {
      return res.status(503).json({
        success: false,
        error: 'Service IMAP non configuré',
        details: 'MAIL_PASSWORD non configuré correctement'
      });
    }
    
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
    console.error('❌ Erreur santé IMAP:', error.message);
    res.status(503).json({
      success: false,
      error: 'Service IMAP indisponible',
      details: error.message
    });
  }
});

// Route pour tester la connexion IMAP (admin seulement)
router.post('/test', authenticateAdmin, async (req, res) => {
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

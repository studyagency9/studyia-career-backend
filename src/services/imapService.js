const { ImapFlow } = require('imapflow');

// Configuration IMAP
const imapConfig = {
  host: 'imap.hostinger.com',
  port: 993,
  secure: true,
  auth: {
    user: 'contact@studyia.net',
    pass: process.env.MAIL_PASSWORD,
  },
};

let client = null;

// Connexion au serveur IMAP
const connectImap = async () => {
  try {
    console.log('🔍 DEBUG: Tentative de connexion IMAP...');
    console.log('🔍 DEBUG: MAIL_PASSWORD présent:', !!process.env.MAIL_PASSWORD);
    console.log('🔍 DEBUG: MAIL_PASSWORD length:', process.env.MAIL_PASSWORD?.length || 0);
    
    if (!process.env.MAIL_PASSWORD || process.env.MAIL_PASSWORD === 'VOTRE_MOT_DE_PASSE_ICI') {
      throw new Error('MAIL_PASSWORD non configuré correctement');
    }
    
    if (client && client.usable) {
      console.log('✅ Client IMAP déjà connecté');
      return client;
    }

    console.log('🔍 DEBUG: Création du client IMAP...');
    client = new ImapFlow(imapConfig);
    
    console.log('🔍 DEBUG: Connexion en cours...');
    await client.connect();
    console.log('✅ Connexion IMAP établie avec contact@studyia.net');
    return client;
  } catch (error) {
    console.error('❌ Erreur de connexion IMAP:', error.message);
    console.error('❌ Détails:', error);
    throw error;
  }
};

// Déconnexion
const disconnectImap = async () => {
  try {
    if (client && client.usable) {
      await client.logout();
      client = null;
      console.log('✅ Déconnexion IMAP réussie');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la déconnexion IMAP:', error);
  }
};

// Lister les emails
const listEmails = async (options = {}) => {
  const {
    limit = 20,
    offset = 0,
    folder = 'INBOX',
    unreadOnly = false,
    search = null
  } = options;

  try {
    // Timeout de 30 secondes pour éviter les blocages
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout lors de la récupération des emails')), 30000);
    });

    const emailsPromise = async () => {
      await connectImap();
      
      // Sélectionner la boîte de réception
      const mailbox = await client.mailboxOpen(folder);
      console.log(`📧 Boîte sélectionnée: ${mailbox.name} (${mailbox.exists} messages)`);

      // Construire la recherche
      let searchCriteria = ['ALL']; // Toujours commencer avec ALL
      
      if (unreadOnly) {
        searchCriteria = ['UNSEEN'];
      }
      
      if (search) {
        // Remplacer la recherche par une recherche combinée
        searchCriteria = ['OR', ['SUBJECT', search], ['FROM', search], ['BODY', search]];
        if (unreadOnly) {
          searchCriteria = ['AND', ['UNSEEN'], searchCriteria];
        }
      }

      // Récupérer les messages
      let messages;
      try {
        console.log('🔍 DEBUG: Search criteria:', searchCriteria);
        const searchResult = await client.search(searchCriteria);
        messages = Array.isArray(searchResult) ? searchResult : [];
        console.log('🔍 DEBUG: Search result:', messages.length, 'messages');
      } catch (searchError) {
        console.error('❌ Erreur recherche IMAP:', searchError.message);
        // Fallback: récupérer tous les messages avec UID range
        try {
          // Récupérer les UIDs de tous les messages
          const mailbox = await client.mailboxOpen(folder);
          const allUids = [];
          for (let i = 1; i <= mailbox.exists; i++) {
            allUids.push(i);
          }
          messages = allUids;
          console.log('🔍 DEBUG: Fallback UIDs:', messages.length, 'messages');
        } catch (fallbackError) {
          console.error('❌ Erreur fallback IMAP:', fallbackError.message);
          messages = [];
        }
      }

      // S'assurer que messages est un tableau
      if (!Array.isArray(messages)) {
        console.error('❌ messages n\'est pas un tableau:', typeof messages, messages);
        messages = [];
      }

      console.log('🔍 DEBUG: Messages trouvés:', messages.length);

      // Limiter et paginer
      const startIndex = Math.max(0, messages.length - offset - limit);
      const endIndex = messages.length - offset;
      const paginatedMessages = messages.slice(startIndex, endIndex);

      // Récupérer les détails des messages
      const emails = [];
      for (const uid of paginatedMessages) {
        try {
          const message = await client.fetchOne(uid, { envelope: true, flags: true, bodyStructure: true });
          
          const email = {
            uid: uid,
            messageId: message.envelope.messageId,
            date: message.envelope.date,
            subject: message.envelope.subject || '(Pas de sujet)',
            from: message.envelope.from?.[0] || null,
            to: message.envelope.to || [],
            cc: message.envelope.cc || [],
            flags: message.flags,
            unread: !message.flags.includes('\\Seen'),
            important: message.flags.includes('\\Flagged'),
            body: '', // Ne pas récupérer le corps pour éviter timeout
            hasAttachments: message.bodyStructure?.parts?.some(part => part.disposition === 'attachment') || false,
            size: message.bodyStructure?.size || 0
          };

          emails.push(email);
        } catch (messageError) {
          console.error(`❌ Erreur récupération message ${uid}:`, messageError.message);
          // Continuer avec les autres messages
        }
      }

      // Inverser pour avoir les plus récents en premier
      emails.reverse();

      return {
        emails,
        total: messages.length,
        folder: mailbox.name,
        unreadCount: mailbox.unseen
      };
    };

    // Exécuter avec timeout
    return await Promise.race([emailsPromise(), timeoutPromise]);
  } catch (error) {
    console.error('❌ Erreur lors de la lecture des emails:', error);
    throw error;
  }
};

// Marquer un email comme lu/non lu
const markEmail = async (uid, read = true) => {
  try {
    await connectImap();
    
    if (read) {
      await client.setFlags(uid, ['\\Seen']);
      console.log(`✅ Email ${uid} marqué comme lu`);
    } else {
      await client.setFlags(uid, ['\\Seen'], { remove: true });
      console.log(`✅ Email ${uid} marqué comme non lu`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du marquage de l\'email:', error);
    throw error;
  }
};

// Supprimer un email
const deleteEmail = async (uid) => {
  try {
    await connectImap();
    
    await client.setFlags(uid, ['\\Deleted']);
    await client.mailboxExpunge();
    console.log(`✅ Email ${uid} supprimé`);
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la suppression de l\'email:', error);
    throw error;
  }
};

// Récupérer un email spécifique
const getEmail = async (uid) => {
  try {
    await connectImap();
    
    console.log('🔍 DEBUG: getEmail appelé pour UID:', uid);
    
    const message = await client.fetchOne(uid, { 
      envelope: true, 
      flags: true, 
      bodyStructure: true
    });
    
    console.log('🔍 DEBUG: Message fetchOne result:', !!message);
    console.log('🔍 DEBUG: Message keys:', message ? Object.keys(message) : 'null');
    
    if (!message) {
      throw new Error('Message non trouvé');
    }
    
    // Récupérer le corps du message séparément
    let body = '';
    let htmlBody = '';
    
    try {
      // Essayer de récupérer le corps texte
      const textBody = await client.fetchOne(uid, { bodyPart: '1' });
      if (textBody && textBody.body) {
        body = textBody.body.toString();
      }
    } catch (bodyError) {
      console.log('🔍 DEBUG: Impossible de récupérer le corps texte:', bodyError.message);
    }
    
    try {
      // Essayer de récupérer le corps HTML
      const htmlPart = await client.fetchOne(uid, { bodyPart: '2' });
      if (htmlPart && htmlPart.body) {
        htmlBody = htmlPart.body.toString();
      }
    } catch (htmlError) {
      console.log('🔍 DEBUG: Impossible de récupérer le corps HTML:', htmlError.message);
    }
    
    // Détecter les pièces jointes
    const hasAttachments = message.bodyStructure && 
      message.bodyStructure.childNodes && 
      message.bodyStructure.childNodes.some(child => child.disposition === 'attachment');
    
    return {
      uid: uid,
      messageId: message.envelope.messageId,
      date: message.envelope.date,
      subject: message.envelope.subject || '(Pas de sujet)',
      from: message.envelope.from?.[0] || null,
      to: message.envelope.to || [],
      cc: message.envelope.cc || [],
      flags: message.flags,
      unread: !message.flags.includes('\\Seen'),
      important: message.flags.includes('\\Flagged'),
      body,
      htmlBody,
      hasAttachments,
      size: message.size || 0,
      attachments: [] // Sera implémenté si nécessaire
    };
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'email:', error);
    throw error;
  }
};

// Statistiques de la boîte mail
const getMailboxStats = async (folder = 'INBOX') => {
  try {
    await connectImap();
    
    const mailbox = await client.mailboxOpen(folder);
    
    const stats = {
      folder: mailbox.name,
      total: mailbox.exists,
      unread: mailbox.unseen,
      recent: mailbox.recent,
      flags: mailbox.flags,
      permanentFlags: mailbox.permanentFlags
    };

    return stats;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des statistiques:', error);
    throw error;
  }
};

// Initialiser le service IMAP
const initImapService = async () => {
  try {
    await connectImap();
    console.log('✅ Service IMAP initialisé avec succès');
    return true;
  } catch (error) {
    console.warn('⚠️ Service IMAP non disponible - Vérifiez les configurations IMAP');
    return false;
  }
};

module.exports = {
  connectImap,
  disconnectImap,
  listEmails,
  getEmail,
  markEmail,
  deleteEmail,
  getMailboxStats,
  initImapService
};

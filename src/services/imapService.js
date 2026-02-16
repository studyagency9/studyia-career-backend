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
  // Ajouter des timeouts pour éviter les crashes
  socketTimeout: 300000, // 5 minutes
  connectTimeout: 30000, // 30 secondes
  idleTimeout: 300000, // 5 minutes
};

let client = null;
let isReconnecting = false;

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

    if (isReconnecting) {
      console.log('� Reconnexion déjà en cours...');
      return client;
    }

    console.log('� DEBUG: Création du client IMAP...');
    client = new ImapFlow(imapConfig);
    
    // Gérer les erreurs de timeout
    client.on('error', (error) => {
      console.error('❌ Erreur IMAP:', error.message);
      if (error.code === 'ETIMEOUT' || error.code === 'ESOCKET') {
        console.log('🔄 Tentative de reconnexion...');
        handleReconnection();
      }
    });

    client.on('close', () => {
      console.log('🔌 Connexion IMAP fermée');
      if (!isReconnecting) {
        handleReconnection();
      }
    });
    
    console.log('🔍 DEBUG: Connexion en cours...');
    await client.connect();
    console.log('✅ Connexion IMAP établie avec contact@studyia.net');
    
    // Envoyer un commande KEEPALIVE toutes les 2 minutes
    setInterval(async () => {
      if (client && client.usable) {
        try {
          await client.noop();
          console.log('🔄 Keepalive IMAP envoyé');
        } catch (error) {
          console.error('❌ Erreur keepalive:', error.message);
        }
      }
    }, 120000); // 2 minutes
    
    return client;
  } catch (error) {
    console.error('❌ Erreur de connexion IMAP:', error.message);
    console.error('❌ Détails:', error);
    throw error;
  }
};

// Gérer la reconnexion automatique
const handleReconnection = async () => {
  if (isReconnecting) return;
  
  isReconnecting = true;
  console.log('🔄 Début de la reconnexion IMAP...');
  
  try {
    if (client) {
      try {
        await client.logout();
      } catch (error) {
        console.log('🔌 Client déjà déconnecté');
      }
      client = null;
    }
    
    // Attendre 5 secondes avant de se reconnecter
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await connectImap();
    console.log('✅ Reconnexion IMAP réussie');
  } catch (error) {
    console.error('❌ Erreur de reconnexion:', error.message);
    // Réessayer dans 30 secondes
    setTimeout(() => {
      isReconnecting = false;
      handleReconnection();
    }, 30000);
  } finally {
    isReconnecting = false;
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
      // Vérifier la connexion avant de continuer
      if (!client || !client.usable) {
        console.log('🔄 Client IMAP déconnecté, tentative de reconnexion...');
        await connectImap();
      }
      
      await connectImap();
      
      // Sélectionner la boîte de réception
      const mailbox = await client.mailboxOpen(folder);
      console.log(`📧 Boîte sélectionnée: ${mailbox.name} (${mailbox.exists} messages)`);

      // Récupérer les messages - CORRECTION FINALE
      let messages;
      try {
        console.log('🔍 DEBUG: Récupération UIDs avec imapflow');
        
        // Étape 1: Ouvrir la boîte mail
        const mailbox = await client.mailboxOpen(folder);
        console.log('🔍 DEBUG: Boîte mail ouverte, exists:', mailbox.exists, 'uidNext:', mailbox.uidNext, 'uidValidity:', mailbox.uidValidity);
        
        // Étape 2: SEARCH avec syntaxe imapflow correcte
        if (mailbox.exists && mailbox.exists > 0) {
          let searchCriteria = {}; // Par défaut: tous les messages
          
          if (unreadOnly) {
            searchCriteria = { seen: false };
          }
          
          if (search) {
            searchCriteria = { 
              or: [
                { subject: search },
                { from: search },
                { body: search }
              ]
            };
            if (unreadOnly) {
              searchCriteria = { 
                and: [{ seen: false }, searchCriteria]
              };
            }
          }
          
          console.log('🔍 DEBUG: Search criteria:', searchCriteria);
          const searchResult = await client.search(searchCriteria);
          messages = Array.isArray(searchResult) ? searchResult : [];
          console.log('🔍 DEBUG: Vrais UIDs trouvés:', messages.length, messages.slice(0, 5));
        } else {
          messages = [];
          console.log('🔍 DEBUG: Aucun message dans la boîte');
        }
      } catch (searchError) {
        console.error('❌ Erreur SEARCH IMAP:', searchError.message);
        console.log('🔍 DEBUG: Fallback - utilisation search({ all: true })');
        
        // CORRECTION : Fallback simple et fiable
        try {
          const fallbackResult = await client.search({ all: true });
          messages = Array.isArray(fallbackResult) ? fallbackResult : [];
          console.log('🔍 DEBUG: Fallback UIDs trouvés:', messages.length, messages.slice(0, 5));
        } catch (fallbackError) {
          console.error('❌ Erreur fallback:', fallbackError.message);
          messages = [];
        }
      }

      // S'assurer que messages est un tableau
      if (!Array.isArray(messages)) {
        console.error('❌ messages n\'est pas un tableau:', typeof messages, messages);
        messages = [];
      }

      console.log('🔍 DEBUG: Messages trouvés:', messages.length);

      // CORRECTION : Trier les UIDs du plus récent au plus ancien
      messages = messages.sort((a, b) => b - a);
      console.log('🔍 DEBUG: UIDs triés (plus récents d\'abord):', messages.slice(0, 5));

      // CORRECTION : Pagination simple sur UIDs triés
      const pageUids = messages.slice(offset, offset + limit);
      console.log('🔍 DEBUG: UIDs pour cette page:', pageUids.length, pageUids);

      // Récupérer les détails des messages
      const emails = [];
      for (const uid of pageUids) {
        try {
          // CORRECTION : Forcer le mode UID dans fetchOne et récupérer le corps
          const message = await client.fetchOne(uid, { 
            uid: true,
            envelope: true, 
            flags: true, 
            bodyStructure: true,
            body: '1.MIME', // Récupérer le corps en MIME
            source: true // Récupérer la source complète
          });
          
          // Gérer les flags correctement avec imapflow
          const flags = message.flags || [];
          console.log(`🔍 DEBUG: Message ${uid} flags:`, typeof flags, flags);
          
          const flagsArray = Array.isArray(flags) ? flags : Object.keys(flags).filter(key => flags[key]);
          console.log(`🔍 DEBUG: Message ${uid} flagsArray:`, flagsArray);
          
          // Détecter les pièces jointes correctement avec imapflow
          const hasAttachments = message.bodyStructure && (
            (message.bodyStructure.parts && message.bodyStructure.parts.some(part => part.disposition === 'attachment')) ||
            (message.bodyStructure.disposition === 'attachment')
          );
          
          // Obtenir la taille correcte
          const size = message.bodyStructure?.size || 
                      (message.bodyStructure?.parts && message.bodyStructure.parts.reduce((total, part) => total + (part.size || 0), 0)) || 
                      0;
          
          // Extraire le corps du message
          let body = '';
          if (message.source) {
            // Extraire le corps texte de la source MIME
            const lines = message.source.split('\n');
            let inBody = false;
            let bodyLines = [];
            
            for (const line of lines) {
              if (inBody) {
                bodyLines.push(line);
              } else if (line.trim() === '' && bodyLines.length > 0) {
                inBody = true;
              } else if (line.startsWith('Content-Type: text/plain')) {
                bodyLines = []; // Commencer à collecter après cette ligne
              }
            }
            
            body = bodyLines.join('\n').trim();
            if (body.length > 1000) {
              body = body.substring(0, 1000) + '...'; // Limiter la taille
            }
          } else if (message.body) {
            body = typeof message.body === 'string' ? message.body : '';
          }
          
          const email = {
            uid: uid,
            messageId: message.envelope.messageId,
            date: message.envelope.date,
            subject: message.envelope.subject || '(Pas de sujet)',
            from: message.envelope.from?.[0] || null,
            to: message.envelope.to || [],
            cc: message.envelope.cc || [],
            flags: flagsArray,
            unread: !flagsArray.includes('\\Seen'),
            important: flagsArray.includes('\\Flagged'),
            body,
            hasAttachments,
            size
          };

          emails.push(email);
        } catch (messageError) {
          console.error(`❌ Erreur récupération message ${uid}:`, messageError.message);
          // Continuer avec les autres messages
        }
      }

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

// Statistiques complètes pour le frontend
const getEmailStats = async () => {
  try {
    await connectImap();
    
    const mailbox = await client.mailboxOpen('INBOX');
    console.log('🔍 DEBUG: Stats - Boîte mail ouverte, exists:', mailbox.exists);
    
    // Utiliser l'approche simple comme listEmails
    let totalEmails = mailbox.exists || 0;
    let unreadEmails = mailbox.unseen || 0;
    
    // Pour les statistiques détaillées, utiliser une approche simple
    let emailsWithAttachments = 0;
    let todayEmails = 0;
    let weekEmails = 0;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Si on a des messages, essayer d'en récupérer quelques-uns pour les stats
    if (totalEmails > 0) {
      try {
        // Récupérer les 10 derniers messages pour les stats
        const limit = Math.min(10, totalEmails);
        const startUid = Math.max(1, totalEmails - limit + 1);
        const endUid = totalEmails;
        
        const fetchResult = await client.fetch(`${startUid}:${endUid}`, { 
          envelope: true, 
          flags: true,
          bodyStructure: true,
          uid: true
        });
        
        if (fetchResult && typeof fetchResult === 'object') {
          Object.values(fetchResult).forEach(message => {
            // Compter les emails avec pièces jointes
            if (message.bodyStructure && 
                message.bodyStructure.childNodes && 
                message.bodyStructure.childNodes.some(child => child.disposition === 'attachment')) {
              emailsWithAttachments++;
            }
            
            // Compter les emails récents
            if (message.envelope.date) {
              const emailDate = new Date(message.envelope.date);
              if (emailDate >= today) {
                todayEmails++;
              }
              if (emailDate >= weekAgo) {
                weekEmails++;
              }
            }
          });
        }
      } catch (fetchError) {
        console.log('🔍 DEBUG: Erreur fetch stats, utilise valeurs par défaut:', fetchError.message);
      }
    }
    
    const stats = {
      total: totalEmails,
      unread: unreadEmails,
      withAttachments: emailsWithAttachments,
      today: todayEmails,
      lastWeek: weekEmails,
      mailboxes: {
        INBOX: {
          total: mailbox.exists,
          unread: mailbox.unseen
        }
      }
    };
    
    console.log('🔍 DEBUG: Stats calculées:', stats);
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
  getEmailStats,
  initImapService
};

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Référence au partenaire destinataire
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    required: true,
    index: true
  },
  
  // Type de notification
  type: {
    type: String,
    enum: [
      'new_application',
      'high_score_candidate',
      'deadline_reminder',
      'job_published',
      'job_closed',
      'candidate_status_changed',
      'system_alert',
      'plan_expiring',
      'quota_warning'
    ],
    required: true
  },
  
  // Titre et message
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  
  // Données contextuelles
  data: {
    jobPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobPost'
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate'
    },
    score: Number,
    metadata: mongoose.Schema.Types.Mixed
  },
  
  // Statut
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },
  
  // Priorité
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Action URL (optionnel)
  actionUrl: {
    type: String
  },
  
  // Expiration (optionnel)
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index composés
notificationSchema.index({ partnerId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ partnerId: 1, type: 1 });

// Méthode pour marquer comme lu
notificationSchema.methods.markAsRead = function() {
  if (!this.read) {
    this.read = true;
    this.readAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Méthode statique pour marquer toutes les notifications d'un partner comme lues
notificationSchema.statics.markAllAsRead = function(partnerId) {
  return this.updateMany(
    { partnerId, read: false },
    { read: true, readAt: new Date() }
  );
};

// Méthode statique pour compter les non lues
notificationSchema.statics.countUnread = function(partnerId) {
  return this.countDocuments({ partnerId, read: false });
};

// Méthode statique pour créer une notification
notificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  await notification.save();
  
  // TODO: Envoyer via WebSocket si connecté
  // TODO: Envoyer email si préférences activées
  
  return notification;
};

// Middleware pour supprimer les notifications expirées
notificationSchema.pre('find', function() {
  this.where({ 
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  });
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;

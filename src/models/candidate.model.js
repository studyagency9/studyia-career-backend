const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  // Référence au JobPost
  jobPostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobPost',
    required: true,
    index: true
  },
  
  // Référence au Partner (pour faciliter les requêtes)
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    required: true,
    index: true
  },
  
  // Fichier CV original
  originalFileName: {
    type: String,
    required: true
  },
  originalFileUrl: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number
  },
  fileType: {
    type: String,
    enum: ['pdf', 'docx', 'doc']
  },
  
  // Données extraites du CV (format CV Builder)
  cvData: {
    // Informations personnelles
    personalInfo: {
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
      address: String,
      city: String,
      country: String,
      dateOfBirth: Date,
      nationality: String,
      maritalStatus: String,
      gender: String,
      drivingLicense: String
    },
    
    // Profil professionnel
    professionalSummary: String,
    
    // Expériences professionnelles
    experiences: [{
      company: String,
      position: String,
      startDate: Date,
      endDate: Date,
      current: Boolean,
      description: String,
      location: String
    }],
    
    // Formation
    education: [{
      institution: String,
      degree: String,
      field: String,
      startDate: Date,
      endDate: Date,
      current: Boolean,
      description: String
    }],
    
    // Compétences
    skills: [{
      name: String,
      level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'expert']
      },
      category: String
    }],
    
    // Langues
    languages: [{
      name: String,
      level: {
        type: String,
        enum: ['basic', 'intermediate', 'fluent', 'native']
      }
    }],
    
    // Certifications
    certifications: [{
      name: String,
      issuer: String,
      date: Date,
      expiryDate: Date,
      credentialId: String
    }],
    
    // Projets
    projects: [{
      name: String,
      description: String,
      url: String,
      startDate: Date,
      endDate: Date
    }],
    
    // Références
    references: [{
      name: String,
      position: String,
      company: String,
      email: String,
      phone: String
    }]
  },
  
  // Analyse de matching IA
  matchingAnalysis: {
    // Score global (0-100)
    globalScore: {
      type: Number,
      min: 0,
      max: 100
    },
    
    // Scores détaillés
    skillsScore: {
      type: Number,
      min: 0,
      max: 100
    },
    experienceScore: {
      type: Number,
      min: 0,
      max: 100
    },
    educationScore: {
      type: Number,
      min: 0,
      max: 100
    },
    
    // Compétences
    matchedSkills: [String],
    missingSkills: [String],
    
    // Points forts et faibles
    strengths: [String],
    weaknesses: [String],
    
    // Recommandation IA
    recommendation: String,
    
    // Détails supplémentaires
    yearsOfExperience: Number,
    educationLevel: String,
    languageMatch: Boolean,
    locationMatch: Boolean,
    
    // Date de l'analyse
    analyzedAt: Date
  },
  
  // Statut de la candidature
  status: {
    type: String,
    enum: ['new', 'reviewed', 'shortlisted', 'interview', 'offer', 'hired', 'rejected'],
    default: 'new',
    index: true
  },
  
  // Pipeline stage (pour le kanban)
  pipelineStage: {
    type: String,
    enum: ['new', 'screening', 'interview', 'offer', 'hired', 'rejected'],
    default: 'new'
  },
  
  // Notes du recruteur
  notes: [{
    content: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Partner'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Historique des changements de statut
  statusHistory: [{
    status: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Partner'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    note: String
  }],
  
  // Flags
  isFavorite: {
    type: Boolean,
    default: false
  },
  isViewed: {
    type: Boolean,
    default: false
  },
  
  // Dates importantes
  viewedAt: Date,
  shortlistedAt: Date,
  rejectedAt: Date,
  hiredAt: Date
}, {
  timestamps: true
});

// Index composés pour les recherches fréquentes
candidateSchema.index({ jobPostId: 1, status: 1 });
candidateSchema.index({ partnerId: 1, status: 1 });
candidateSchema.index({ jobPostId: 1, 'matchingAnalysis.globalScore': -1 });
candidateSchema.index({ partnerId: 1, createdAt: -1 });

// Méthode pour ajouter une note
candidateSchema.methods.addNote = function(content, userId) {
  this.notes.push({
    content,
    createdBy: userId,
    createdAt: new Date()
  });
  return this.save();
};

// Méthode pour changer le statut
candidateSchema.methods.changeStatus = function(newStatus, userId, note) {
  const oldStatus = this.status;
  this.status = newStatus;
  this.pipelineStage = this.mapStatusToPipeline(newStatus);
  
  this.statusHistory.push({
    status: newStatus,
    changedBy: userId,
    changedAt: new Date(),
    note: note || `Status changed from ${oldStatus} to ${newStatus}`
  });
  
  // Mettre à jour les dates spécifiques
  if (newStatus === 'shortlisted') this.shortlistedAt = new Date();
  if (newStatus === 'rejected') this.rejectedAt = new Date();
  if (newStatus === 'hired') this.hiredAt = new Date();
  
  return this.save();
};

// Mapper le statut au pipeline stage
candidateSchema.methods.mapStatusToPipeline = function(status) {
  const mapping = {
    'new': 'new',
    'reviewed': 'screening',
    'shortlisted': 'screening',
    'interview': 'interview',
    'offer': 'offer',
    'hired': 'hired',
    'rejected': 'rejected'
  };
  return mapping[status] || 'new';
};

// Méthode pour marquer comme vu
candidateSchema.methods.markAsViewed = function() {
  if (!this.isViewed) {
    this.isViewed = true;
    this.viewedAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Méthode pour basculer favori
candidateSchema.methods.toggleFavorite = function() {
  this.isFavorite = !this.isFavorite;
  return this.save();
};

const Candidate = mongoose.model('Candidate', candidateSchema);

module.exports = Candidate;

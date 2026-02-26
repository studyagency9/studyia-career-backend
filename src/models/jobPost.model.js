const mongoose = require('mongoose');

const jobPostSchema = new mongoose.Schema({
  // Référence au partenaire propriétaire
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    required: true,
    index: true
  },
  
  // Informations de base
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  company: {
    type: String,
    required: true
  },
  
  // Localisation
  city: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  remote: {
    type: Boolean,
    default: false
  },
  
  // Compétences
  requiredSkills: [{
    type: String,
    trim: true
  }],
  optionalSkills: [{
    type: String,
    trim: true
  }],
  
  // Éducation et Expérience
  education: [{
    type: String,
    enum: ['high_school', 'bachelor', 'master', 'phd']
  }],
  experience: {
    type: String,
    enum: ['entry', 'junior', 'mid', 'senior', 'expert'],
    required: true
  },
  minYearsExperience: {
    type: Number,
    default: 0
  },
  
  // Type de contrat
  contractType: {
    type: String,
    enum: ['full_time', 'part_time', 'contract', 'internship', 'freelance'],
    required: true
  },
  
  // Salaire
  salaryMin: {
    type: Number
  },
  salaryMax: {
    type: Number
  },
  currency: {
    type: String,
    default: 'XAF'
  },
  
  // Dates
  deadline: {
    type: Date,
    required: true
  },
  startDate: {
    type: Date
  },
  publishedAt: {
    type: Date
  },
  closedAt: {
    type: Date
  },
  
  // Statut
  status: {
    type: String,
    enum: ['draft', 'active', 'closed', 'archived'],
    default: 'draft'
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  
  // Critères spécifiques
  languageRequirement: {
    type: String,
    enum: ['bilingual', 'french', 'english', 'none'],
    default: 'none'
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'any'],
    default: 'any'
  },
  maritalStatus: {
    type: String,
    enum: ['single', 'married', 'any'],
    default: 'any'
  },
  minAge: {
    type: Number
  },
  maxAge: {
    type: Number
  },
  childrenAccepted: {
    type: Boolean,
    default: true
  },
  drivingLicense: {
    type: String,
    enum: ['required', 'preferred', 'not_required'],
    default: 'not_required'
  },
  
  // Contact
  contactEmail: {
    type: String
  },
  contactPhone: {
    type: String
  },
  contactWhatsApp: {
    type: String
  },
  contactAddress: {
    type: String
  },
  contactWebsite: {
    type: String
  },
  
  // Statistiques
  viewCount: {
    type: Number,
    default: 0
  },
  applicationCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index pour les recherches fréquentes
jobPostSchema.index({ partnerId: 1, status: 1 });
jobPostSchema.index({ partnerId: 1, createdAt: -1 });
jobPostSchema.index({ status: 1, deadline: 1 });

// Méthode pour vérifier si l'offre est expirée
jobPostSchema.methods.isExpired = function() {
  return this.deadline < new Date();
};

// Méthode pour publier l'offre
jobPostSchema.methods.publish = function() {
  this.status = 'active';
  this.publishedAt = new Date();
  return this.save();
};

// Méthode pour fermer l'offre
jobPostSchema.methods.close = function() {
  this.status = 'closed';
  this.closedAt = new Date();
  return this.save();
};

// Méthode pour archiver l'offre
jobPostSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

// Middleware pour incrémenter le compteur de vues
jobPostSchema.methods.incrementViews = function() {
  this.viewCount += 1;
  return this.save();
};

// Middleware pour incrémenter le compteur de candidatures
jobPostSchema.methods.incrementApplications = function() {
  this.applicationCount += 1;
  return this.save();
};

const JobPost = mongoose.model('JobPost', jobPostSchema);

module.exports = JobPost;

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const partnerSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  company: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: false
  },
  country: {
    type: String,
    required: false
  },
  city: {
    type: String,
    required: false
  },
  plan: {
    type: String,
    enum: ['starter', 'pro', 'business'],
    default: 'pro'
  },
  planPrice: {
    type: Number,
    required: false
  },
  // Quota de CV selon le plan
  cvQuota: {
    type: Number,
    required: true,
    default: 50 // Par défaut pour le plan pro
  },
  // Nombre de CV utilisés ce mois-ci
  cvUsedThisMonth: {
    type: Number,
    default: 0
  },
  // Date de début du compteur mensuel
  cvCounterStartDate: {
    type: Date,
    default: Date.now
  },
  planRenewalDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Méthode pour comparer les mots de passe
partnerSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Méthode pour obtenir le quota de CV selon le plan
partnerSchema.methods.getCvQuota = function() {
  const quotas = {
    starter: 10,
    pro: 50,
    business: 200
  };
  return quotas[this.plan] || 50;
};

// Méthode pour vérifier si le partner peut créer un CV
partnerSchema.methods.canCreateCV = function() {
  // Réinitialiser le compteur si début de nouveau mois
  const now = new Date();
  const counterStart = new Date(this.cvCounterStartDate);
  
  // Si on est dans un nouveau mois, réinitialiser
  if (now.getMonth() !== counterStart.getMonth() || now.getFullYear() !== counterStart.getFullYear()) {
    this.cvUsedThisMonth = 0;
    this.cvCounterStartDate = now;
  }
  
  return this.cvUsedThisMonth < this.getCvQuota();
};

// Méthode pour incrémenter le compteur de CV
partnerSchema.methods.incrementCVCount = function() {
  if (this.canCreateCV()) {
    this.cvUsedThisMonth += 1;
    return true;
  }
  return false;
};

// Méthode pour obtenir les statistiques d'utilisation
partnerSchema.methods.getCVStats = function() {
  const quota = this.getCvQuota();
  const used = this.cvUsedThisMonth;
  const remaining = Math.max(0, quota - used);
  const percentageUsed = Math.round((used / quota) * 100);
  
  return {
    quota,
    used,
    remaining,
    percentageUsed,
    isLimitReached: used >= quota,
    plan: this.plan
  };
};

// Middleware pour définir le quota automatiquement selon le plan
partnerSchema.pre('save', async function(next) {
  if (this.isModified('plan')) {
    this.cvQuota = this.getCvQuota();
  }
  next();
});

// Middleware pour hacher le mot de passe avant l'enregistrement
partnerSchema.pre('save', async function(next) {
  if (this.isModified('passwordHash')) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  }
  next();
});

const Partner = mongoose.model('Partner', partnerSchema);

module.exports = Partner;

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
  plan: {
    type: String,
    enum: ['starter', 'pro', 'business'],
    default: 'pro'
  },
  cvUsedThisMonth: {
    type: Number,
    default: 0
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

// Middleware pour hacher le mot de passe avant l'enregistrement
partnerSchema.pre('save', async function(next) {
  if (this.isModified('passwordHash')) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  }
  next();
});

const Partner = mongoose.model('Partner', partnerSchema);

module.exports = Partner;

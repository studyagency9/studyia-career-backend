const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const associateSchema = new mongoose.Schema({
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
  phone: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  referralCode: {
    type: String,
    required: true,
    unique: true
  },
  referralLink: {
    type: String,
    required: true
  },
  totalSales: {
    type: Number,
    default: 0
  },
  totalCommission: {
    type: Number,
    default: 0
  },
  availableBalance: {
    type: Number,
    default: 0
  },
  withdrawnAmount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'banned'],
    default: 'active'
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Méthode pour comparer les mots de passe
associateSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Middleware pour hacher le mot de passe avant l'enregistrement
associateSchema.pre('save', async function(next) {
  if (this.isModified('passwordHash')) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  }
  next();
});

const Associate = mongoose.model('Associate', associateSchema);

module.exports = Associate;

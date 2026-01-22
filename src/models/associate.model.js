const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Schéma pour l'historique des retraits
const withdrawalHistorySchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true
  },
  fee: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'rejected'],
    default: 'pending'
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  processedDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['mobile_money', 'bank_transfer'],
    required: true
  }
}, { _id: false });

// Schéma pour l'historique des ventes
const salesHistorySchema = new mongoose.Schema({
  cvId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CV'
  },
  clientName: {
    type: String
  },
  clientEmail: {
    type: String
  },
  amount: {
    type: Number,
    required: true
  },
  commission: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'validated', 'rejected'],
    default: 'pending'
  }
}, { _id: false });

// Schéma pour les statistiques de parrainage
const referralStatsSchema = new mongoose.Schema({
  totalCVs: {
    type: Number,
    default: 0
  },
  cvsByMonth: {
    type: Map,
    of: Number,
    default: new Map()
  },
  salesByDay: {
    type: Map,
    of: Number,
    default: new Map()
  },
  salesByWeek: {
    type: Map,
    of: Number,
    default: new Map()
  },
  salesByMonth: {
    type: Map,
    of: Number,
    default: new Map()
  }
}, { _id: false });

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
  pendingBalance: {
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
  },
  referralStats: {
    type: referralStatsSchema,
    default: () => ({})
  },
  withdrawalHistory: {
    type: [withdrawalHistorySchema],
    default: []
  },
  salesHistory: {
    type: [salesHistorySchema],
    default: []
  },
  paymentDetails: {
    mobileMoneyNumber: String,
    mobileMoneyProvider: String,
    bankName: String,
    bankAccountNumber: String,
    bankAccountName: String
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

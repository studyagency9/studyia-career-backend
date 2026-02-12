const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Schéma Partner
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
  },
  cvHistory: [{
    cvId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CV'
    },
    name: String,
    pdfUrl: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Méthode pour comparer les mots de passe
partnerSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Middleware pour hacher le mot de passe avant l'enregistrement
partnerSchema.pre('save', async function() {
  if (this.isModified('passwordHash')) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  }
});

// Schéma CV
const cvSchema = new mongoose.Schema({
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner'
  },
  name: {
    type: String,
    required: true
  },
  language: {
    type: String,
    enum: ['fr', 'en'],
    required: true
  },
  data: {
    type: Object,
    required: true
  },
  pdfUrl: {
    type: String,
    default: null
  },
  referralCode: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Schéma Plan
const planSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['starter', 'pro', 'business'],
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  monthlyQuota: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  pricePerDay: {
    type: Number,
    required: true
  },
  features: {
    type: [String],
    required: true
  },
  badge: {
    type: String,
    default: null
  },
  recommended: {
    type: Boolean,
    default: false
  }
});

// Schéma Session
const sessionSchema = new mongoose.Schema({
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    required: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Schéma Admin
const adminSchema = new mongoose.Schema({
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
  role: {
    type: String,
    enum: ['admin', 'superadmin', 'comptable', 'secretaire'],
    default: 'admin'
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Méthode pour comparer les mots de passe
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Middleware pour hacher le mot de passe avant l'enregistrement
adminSchema.pre('save', async function() {
  if (this.isModified('passwordHash')) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  }
});

// Schéma Associate
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
  referralStats: {
    totalCVs: {
      type: Number,
      default: 0
    },
    cvsByMonth: {
      type: Map,
      of: Number,
      default: new Map()
    }
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
  withdrawalHistory: [{
    amount: Number,
    fee: Number,
    status: {
      type: String,
      enum: ['pending', 'completed', 'rejected'],
      default: 'pending'
    },
    requestDate: {
      type: Date,
      default: Date.now
    },
    completionDate: Date,
    paymentMethod: String,
    transactionId: String
  }],
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
associateSchema.pre('save', async function() {
  if (this.isModified('passwordHash')) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  }
});

// Schéma Payment
const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId
  },
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner'
  },
  associateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Associate'
  },
  amount: {
    type: Number,
    required: true
  },
  fee: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'FCFA'
  },
  type: {
    type: String,
    enum: ['cv_purchase', 'partner_subscription', 'associate_commission', 'withdrawal'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'mobile_money', 'bank_transfer'],
    required: true
  },
  transactionId: {
    type: String
  },
  notes: {
    type: String
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  processedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Schéma Personnel
const personnelSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['M', 'F'],
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  position: {
    type: String,
    required: true
  },
  cvId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CV'
  },
  cvPdfUrl: {
    type: String
  },
  additionalInfo: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

// Schéma Invoice
const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  clientType: {
    type: String,
    enum: ['customer', 'associate', 'partner'],
    required: true
  },
  clientInfo: {
    name: String,
    email: String,
    phone: String,
    company: String
  },
  items: [{
    description: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      default: 1
    },
    unitPrice: {
      type: Number,
      required: true
    },
    total: {
      type: Number,
      required: true
    }
  }],
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'cancelled'],
    default: 'pending'
  },
  paidAt: Date,
  paymentDate: Date,
  paymentMethod: String,
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  }
}, {
  timestamps: true
});

// Création des modèles
const Partner = mongoose.model('Partner', partnerSchema);
const CV = mongoose.model('CV', cvSchema);
const Plan = mongoose.model('Plan', planSchema);
const Session = mongoose.model('Session', sessionSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Associate = mongoose.model('Associate', associateSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const Personnel = mongoose.model('Personnel', personnelSchema);
const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = {
  Partner,
  CV,
  Plan,
  Session,
  Admin,
  Associate,
  Payment,
  Personnel,
  Invoice
};

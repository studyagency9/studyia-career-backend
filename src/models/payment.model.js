const mongoose = require('mongoose');

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
  }
}, {
  timestamps: true
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;

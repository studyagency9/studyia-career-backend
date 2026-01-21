const mongoose = require('mongoose');

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

const Plan = mongoose.model('Plan', planSchema);

module.exports = Plan;

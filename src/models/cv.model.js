const mongoose = require('mongoose');

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
  }
}, {
  timestamps: true
});

const CV = mongoose.model('CV', cvSchema);

module.exports = CV;

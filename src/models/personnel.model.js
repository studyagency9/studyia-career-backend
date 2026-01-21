const mongoose = require('mongoose');

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

// Création du modèle
const Personnel = mongoose.model('Personnel', personnelSchema);

module.exports = Personnel;

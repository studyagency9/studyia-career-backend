const mongoose = require('mongoose');
const crypto = require('crypto');

const gmailTokenSchema = new mongoose.Schema({
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  scope: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

const ENCRYPTION_KEY = process.env.GMAIL_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-cbc';

gmailTokenSchema.methods.encryptToken = function(token) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'), iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

gmailTokenSchema.methods.decryptToken = function(encryptedToken) {
  const parts = encryptedToken.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

gmailTokenSchema.methods.setTokens = function(accessToken, refreshToken) {
  this.accessToken = this.encryptToken(accessToken);
  this.refreshToken = this.encryptToken(refreshToken);
};

gmailTokenSchema.methods.getAccessToken = function() {
  return this.decryptToken(this.accessToken);
};

gmailTokenSchema.methods.getRefreshToken = function() {
  return this.decryptToken(this.refreshToken);
};

gmailTokenSchema.methods.isExpired = function() {
  return new Date() >= this.expiresAt;
};

gmailTokenSchema.methods.isExpiringSoon = function() {
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  return this.expiresAt <= fiveMinutesFromNow;
};

const GmailToken = mongoose.model('GmailToken', gmailTokenSchema);

module.exports = GmailToken;

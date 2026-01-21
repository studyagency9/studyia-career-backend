const sequelize = require('../config/database');
const Partner = require('./partner');
const CV = require('./cv');
const Plan = require('./plan');
const Session = require('./session');
const Admin = require('./admin');
const Associate = require('./associate');
const Payment = require('./payment');

// Define relationships
Partner.hasMany(CV, { foreignKey: 'partnerId', as: 'cvs' });
CV.belongsTo(Partner, { foreignKey: 'partnerId', as: 'partner' });

Partner.hasMany(Session, { foreignKey: 'partnerId', as: 'sessions' });
Session.belongsTo(Partner, { foreignKey: 'partnerId', as: 'partner' });

Partner.hasMany(Payment, { foreignKey: 'partnerId', as: 'payments' });
Payment.belongsTo(Partner, { foreignKey: 'partnerId', as: 'partner' });

Associate.hasMany(Payment, { foreignKey: 'associateId', as: 'payments' });
Payment.belongsTo(Associate, { foreignKey: 'associateId', as: 'associate' });

// Export models
module.exports = {
  sequelize,
  Partner,
  CV,
  Plan,
  Session,
  Admin,
  Associate,
  Payment
};

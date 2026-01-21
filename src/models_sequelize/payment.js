const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'user_id'
  },
  partnerId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'partner_id',
    references: {
      model: 'partners',
      key: 'id'
    }
  },
  associateId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'associate_id',
    references: {
      model: 'associates',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'FCFA'
  },
  type: {
    type: DataTypes.ENUM('cv_purchase', 'partner_subscription', 'associate_commission', 'withdrawal'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
    allowNull: false,
    defaultValue: 'pending'
  },
  paymentMethod: {
    type: DataTypes.ENUM('card', 'mobile_money', 'bank_transfer'),
    allowNull: false,
    field: 'payment_method'
  },
  transactionId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'transaction_id'
  }
}, {
  tableName: 'payments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Payment;

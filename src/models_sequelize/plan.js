const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Plan = sequelize.define('Plan', {
  type: {
    type: DataTypes.ENUM('starter', 'pro', 'business'),
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  monthlyQuota: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'monthly_quota'
  },
  price: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  pricePerDay: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'price_per_day'
  },
  features: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  badge: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  recommended: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'plans',
  timestamps: false
});

module.exports = Plan;

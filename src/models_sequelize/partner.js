const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');

const Partner = sequelize.define('Partner', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash'
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'first_name'
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'last_name'
  },
  company: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  plan: {
    type: DataTypes.ENUM('starter', 'pro', 'business'),
    defaultValue: 'pro'
  },
  cvUsedThisMonth: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'cv_used_this_month'
  },
  planRenewalDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'plan_renewal_date'
  }
}, {
  tableName: 'partners',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (partner) => {
      if (partner.passwordHash) {
        partner.passwordHash = await bcrypt.hash(partner.passwordHash, 10);
      }
    },
    beforeUpdate: async (partner) => {
      if (partner.changed('passwordHash')) {
        partner.passwordHash = await bcrypt.hash(partner.passwordHash, 10);
      }
    }
  }
});

// Instance method to compare passwords
Partner.prototype.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = Partner;

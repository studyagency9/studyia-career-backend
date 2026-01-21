const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');

const Associate = sequelize.define('Associate', {
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
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  referralCode: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'referral_code'
  },
  referralLink: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'referral_link'
  },
  totalSales: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_sales'
  },
  totalCommission: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_commission'
  },
  availableBalance: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'available_balance'
  },
  withdrawnAmount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'withdrawn_amount'
  },
  status: {
    type: DataTypes.ENUM('active', 'suspended', 'banned'),
    defaultValue: 'active'
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_verified'
  }
}, {
  tableName: 'associates',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (associate) => {
      if (associate.passwordHash) {
        associate.passwordHash = await bcrypt.hash(associate.passwordHash, 10);
      }
    },
    beforeUpdate: async (associate) => {
      if (associate.changed('passwordHash')) {
        associate.passwordHash = await bcrypt.hash(associate.passwordHash, 10);
      }
    }
  }
});

// Instance method to compare passwords
Associate.prototype.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = Associate;

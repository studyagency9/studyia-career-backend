const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');

const Admin = sequelize.define('Admin', {
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
  role: {
    type: DataTypes.ENUM('admin', 'superadmin'),
    allowNull: false,
    defaultValue: 'admin'
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login'
  }
}, {
  tableName: 'admins',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  hooks: {
    beforeCreate: async (admin) => {
      if (admin.passwordHash) {
        admin.passwordHash = await bcrypt.hash(admin.passwordHash, 10);
      }
    },
    beforeUpdate: async (admin) => {
      if (admin.changed('passwordHash')) {
        admin.passwordHash = await bcrypt.hash(admin.passwordHash, 10);
      }
    }
  }
});

// Instance method to compare passwords
Admin.prototype.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = Admin;

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CV = sequelize.define('CV', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  partnerId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'partner_id',
    references: {
      model: 'partners',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  language: {
    type: DataTypes.ENUM('fr', 'en'),
    allowNull: false
  },
  data: {
    type: DataTypes.JSONB,
    allowNull: false
  }
}, {
  tableName: 'cvs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = CV;

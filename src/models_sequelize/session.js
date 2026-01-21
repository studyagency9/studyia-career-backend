const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Session = sequelize.define('Session', {
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
  refreshToken: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'refresh_token'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at'
  }
}, {
  tableName: 'sessions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Session;

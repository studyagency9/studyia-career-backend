const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

// Generate access token for a user (partner, admin, associate)
exports.generateAccessToken = (user, role) => {
  return jwt.sign(
    {
      sub: user._id || user.id, // Utiliser _id s'il existe, sinon id
      email: user.email,
      role: role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
};

// Generate refresh token for a user
exports.generateRefreshToken = (userId) => {
  return jwt.sign(
    {
      sub: userId,
      type: 'refresh'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
  );
};

// Verify a token
exports.verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

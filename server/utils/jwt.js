/**
 * JWT helper.
 * Keep secret + expiry centralised so rotating them is a one-line change.
 */
const jwt = require('jsonwebtoken');

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s || s === 'change-me-to-a-long-random-string') {
    // In dev this is just a warning, not a fatal error.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
  }
  return s || 'dev-insecure-secret';
}

function signToken(payload, options = {}) {
  return jwt.sign(payload, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    ...options,
  });
}

function verifyToken(token) {
  return jwt.verify(token, getSecret());
}

module.exports = { signToken, verifyToken };

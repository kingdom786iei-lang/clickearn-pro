const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  passwordHash: String,
  balanceUSD: { type: Number, default: 0 },
  ip: String,
  deviceFingerprint: String,
  isBanned: { type: Boolean, default: false },
  role: { type: String, default: 'user' }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);

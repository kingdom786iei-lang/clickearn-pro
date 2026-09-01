const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  passwordHash: String,
  balanceUSD: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  usdtAddress: { type: String, default: '' },
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  referralEarnings: { type: Number, default: 0 },
  lastLoginBonusAt: { type: Date, default: null },
  ip: String,
  deviceFingerprint: String,
  isBanned: { type: Boolean, default: false },
  role: { type: String, default: 'user' }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);

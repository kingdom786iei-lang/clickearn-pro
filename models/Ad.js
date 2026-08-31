const mongoose = require('mongoose');

const AdSchema = new mongoose.Schema({
  title: { type: String, required: true },
  reward: { type: Number, required: true },
  cooldownSeconds: { type: Number, default: 30 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Ad', AdSchema);

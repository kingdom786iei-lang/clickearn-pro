const mongoose = require('mongoose');

const AdViewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', required: true },
  rewardGiven: Number
}, { timestamps: true });

AdViewSchema.index({ userId: 1, adId: 1, createdAt: -1 });

module.exports = mongoose.model('AdView', AdViewSchema);

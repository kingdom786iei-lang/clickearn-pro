const mongoose = require('mongoose');

const TxSchema = new mongoose.Schema({
  txId: { type: String, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  grossAmount: Number,
  userShare: Number,
  platformShare: Number
}, { timestamps: true });

module.exports = mongoose.model('Transaction', TxSchema);

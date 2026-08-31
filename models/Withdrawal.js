const mongoose = require('mongoose');

const WdSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  requestedAmount: Number,
  gasFee: Number,
  platformFee: Number,
  netAmount: Number,
  usdtAddress: String,
  status: { type: String, default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Withdrawal', WdSchema);

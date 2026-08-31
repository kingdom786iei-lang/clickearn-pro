const express = require('express');
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// Request withdrawal — userId comes from the verified JWT, never the request
// body, so a user can only request a withdrawal against their own balance.
router.post('/request', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, usdtAddress } = req.body;

    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: "Invalid amount" });
    if (amt < 5) return res.status(400).json({ error: "Minimum withdrawal is $5" });
    if (!usdtAddress) return res.status(400).json({ error: "USDT address required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.isBanned) return res.status(403).json({ error: "Account banned" });
    if (user.balanceUSD < amt) return res.status(400).json({ error: "Insufficient balance" });

    const gasFee = amt * 0.02;
    const platformFee = amt * 0.05;
    const netAmount = amt - gasFee - platformFee;
    if (netAmount <= 0) return res.status(400).json({ error: "Amount too small after fees" });

    user.balanceUSD -= amt;
    await user.save();

    const withdrawal = await Withdrawal.create({
      userId,
      requestedAmount: amt,
      gasFee,
      platformFee,
      netAmount,
      usdtAddress,
      status: 'pending'
    });

    res.json({ success: true, withdrawal, balanceUSD: user.balanceUSD });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get the logged-in user's own withdrawal history
router.get('/history/:userId', verifyToken, async (req, res) => {
  try {
    if (req.params.userId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const withdrawals = await Withdrawal.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json({ withdrawals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

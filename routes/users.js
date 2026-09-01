const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const AdView = require('../models/AdView');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// Get logged-in user's full profile
router.get('/me', verifyToken, async (req,res)=>{
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if(!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Update USDT address
router.post('/usdt-address', verifyToken, async (req,res)=>{
  try {
    const { usdtAddress } = req.body;
    if(!usdtAddress) return res.status(400).json({ error: "Address required" });
    const user = await User.findByIdAndUpdate(req.user.id, { usdtAddress }, { new: true });
    res.json({ success: true, usdtAddress: user.usdtAddress });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Today / week / total earnings summary
router.get('/stats', verifyToken, async (req,res)=>{
  try {
    const userId = req.user.id;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday); 
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const [todayViews, weekViews, user] = await Promise.all([
      AdView.find({ userId, createdAt: { $gte: startOfToday } }),
      AdView.find({ userId, createdAt: { $gte: startOfWeek } }),
      User.findById(userId)
    ]);

    const todayEarned = todayViews.reduce((s,v)=> s + (v.rewardGiven||0), 0);
    const weekEarned = weekViews.reduce((s,v)=> s + (v.rewardGiven||0), 0);

    res.json({
      todayEarned,
      weekEarned,
      totalEarned: user.totalEarned || 0,
      balanceUSD: user.balanceUSD,
      referralEarnings: user.referralEarnings || 0,
      referralCode: user.referralCode
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Referral info — how many people referred + earnings from them
router.get('/referrals', verifyToken, async (req,res)=>{
  try {
    const referred = await User.find({ referredBy: req.user.id }).select('email createdAt balanceUSD');
    const user = await User.findById(req.user.id);
    res.json({ 
      referralCode: user.referralCode, 
      referralEarnings: user.referralEarnings || 0,
      referredUsers: referred 
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Full transaction history (ad views) for the logged-in user
router.get('/history', verifyToken, async (req,res)=>{
  try {
    const views = await AdView.find({ userId: req.user.id }).populate('adId', 'title').sort({ createdAt: -1 }).limit(100);
    res.json({ history: views });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Leaderboard — top 10 earners
router.get('/leaderboard', async (req,res)=>{
  try {
    const top = await User.find({ isBanned: false }).sort({ totalEarned: -1 }).limit(10).select('email totalEarned');
    res.json({ leaderboard: top });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Daily login bonus — once per 24h
router.post('/daily-bonus', verifyToken, async (req,res)=>{
  try {
    const user = await User.findById(req.user.id);
    if(!user) return res.status(404).json({ error: "User not found" });

    const now = new Date();
    if(user.lastLoginBonusAt){
      const hoursSince = (now - user.lastLoginBonusAt) / 1000 / 60 / 60;
      if(hoursSince < 24){
        const wait = Math.ceil(24 - hoursSince);
        return res.status(429).json({ error: `Already claimed. Try again in ${wait}h` });
      }
    }

    const BONUS = 0.005;
    user.balanceUSD += BONUS;
    user.totalEarned += BONUS;
    user.lastLoginBonusAt = now;
    await user.save();

    res.json({ success: true, bonus: BONUS, balanceUSD: user.balanceUSD });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

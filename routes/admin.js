const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');
const Ad = require('../models/Ad');
const router = express.Router();

const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if(!token) return res.status(401).json({ error: "Unauthorized" });
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if(decoded.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    req.admin = decoded;
    next();
  } catch(err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

router.get('/users', verifyAdmin, async (req,res)=>{
  try {
    const users = await User.find().select('-passwordHash');
    res.json({ users });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/ban/:userId', verifyAdmin, async (req,res)=>{
  try {
    await User.findByIdAndUpdate(req.params.userId, { isBanned: true });
    res.json({ success: true, message: "User banned" });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', verifyAdmin, async (req,res)=>{
  try {
    const totalUsers = await User.countDocuments();
    const totalTransactions = await Transaction.countDocuments();
    const totalPlatformEarnings = await Transaction.aggregate([
      { $group: { _id: null, total: { $sum: '$platformShare' } } }
    ]);
    
    res.json({
      totalUsers,
      totalTransactions,
      platformEarnings: totalPlatformEarnings[0]?.total || 0
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ads', verifyAdmin, async (req,res)=>{
  try {
    const ads = await Ad.find().sort({ createdAt: -1 });
    res.json({ ads });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/ads', verifyAdmin, async (req,res)=>{
  try {
    const { title, reward, cooldownSeconds } = req.body;
    if(!title || reward === undefined || reward <= 0) {
      return res.status(400).json({ error: "title and a positive reward are required" });
    }
    const ad = await Ad.create({ title, reward, cooldownSeconds: cooldownSeconds || 30 });
    res.json({ success: true, ad });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/ads/:adId/toggle', verifyAdmin, async (req,res)=>{
  try {
    const ad = await Ad.findById(req.params.adId);
    if(!ad) return res.status(404).json({ error: "Ad not found" });
    ad.active = !ad.active;
    await ad.save();
    res.json({ success: true, ad });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/withdrawals', verifyAdmin, async (req,res)=>{
  try {
    const filter = {};
    if(req.query.status) filter.status = req.query.status;
    const withdrawals = await Withdrawal.find(filter).populate('userId', 'email').sort({ createdAt: -1 });
    res.json({ withdrawals });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/approve-withdrawal/:withdrawalId', verifyAdmin, async (req,res)=>{
  try {
    const withdrawal = await Withdrawal.findById(req.params.withdrawalId);
    if(!withdrawal) return res.status(404).json({ error: "Withdrawal not found" });
    if(withdrawal.status !== 'pending') return res.status(400).json({ error: `Already ${withdrawal.status}` });

    withdrawal.status = 'approved';
    await withdrawal.save();
    res.json({ success: true, withdrawal });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reject-withdrawal/:withdrawalId', verifyAdmin, async (req,res)=>{
  try {
    const withdrawal = await Withdrawal.findById(req.params.withdrawalId);
    if(!withdrawal) return res.status(404).json({ error: "Withdrawal not found" });
    if(withdrawal.status !== 'pending') return res.status(400).json({ error: `Already ${withdrawal.status}` });

    withdrawal.status = 'rejected';
    await withdrawal.save();
    await User.findByIdAndUpdate(withdrawal.userId, { $inc: { balanceUSD: withdrawal.requestedAmount } });

    res.json({ success: true, withdrawal });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

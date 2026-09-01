const express = require('express');
const Ad = require('../models/Ad');
const AdView = require('../models/AdView');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

const REFERRAL_BONUS_PERCENT = 0.10; // 10% of referred user's earnings goes to referrer

router.get('/', async (req, res) => {
  try {
    const ads = await Ad.find({ active: true }).select('title reward cooldownSeconds');
    res.json({ ads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/click/:adId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { adId } = req.params;

    const [ad, user] = await Promise.all([
      Ad.findById(adId),
      User.findById(userId)
    ]);

    if (!ad || !ad.active) return res.status(404).json({ error: 'Ad not found' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isBanned) return res.status(403).json({ error: 'Account banned' });

    const lastView = await AdView.findOne({ userId, adId }).sort({ createdAt: -1 });
    if (lastView) {
      const secondsSince = (Date.now() - lastView.createdAt.getTime()) / 1000;
      if (secondsSince < ad.cooldownSeconds) {
        const wait = Math.ceil(ad.cooldownSeconds - secondsSince);
        return res.status(429).json({ error: `Wait ${wait}s before viewing this ad again` });
      }
    }

    user.balanceUSD += ad.reward;
    user.totalEarned += ad.reward;
    await user.save();
    await AdView.create({ userId, adId, rewardGiven: ad.reward });

    // Give referrer their cut, if this user was referred
    if (user.referredBy) {
      const bonus = ad.reward * REFERRAL_BONUS_PERCENT;
      await User.findByIdAndUpdate(user.referredBy, {
        $inc: { balanceUSD: bonus, referralEarnings: bonus, totalEarned: bonus }
      });
    }

    res.json({ success: true, reward: ad.reward, balanceUSD: user.balanceUSD });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

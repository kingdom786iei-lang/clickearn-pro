const express = require('express');
const Ad = require('../models/Ad');
const AdView = require('../models/AdView');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// Get available ads (public list — reward amounts are set by admin, not the client)
router.get('/', async (req, res) => {
  try {
    const ads = await Ad.find({ active: true }).select('title reward cooldownSeconds');
    res.json({ ads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Record a view/click and credit the reward.
// userId comes from the verified JWT, never from the request body —
// otherwise anyone could POST someone else's userId and credit their account.
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
    await user.save();
    await AdView.create({ userId, adId, rewardGiven: ad.reward });

    res.json({ success: true, reward: ad.reward, balanceUSD: user.balanceUSD });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

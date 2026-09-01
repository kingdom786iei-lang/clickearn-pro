const express = require('express');
const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const router = express.Router();

// ===== Generic postback (existing) =====
router.post('/', async (req,res)=>{
  const { userId, txId, amount } = req.body;

  const dup = await Transaction.findOne({ txId });
  if(dup) return res.status(409).send("Duplicate blocked");

  const gross = parseFloat(amount);
  const userShare = gross * 0.70;
  const platformShare = gross * 0.30;

  await User.findByIdAndUpdate(userId, { $inc: { balanceUSD: userShare } });
  await Transaction.create({ txId, userId, grossAmount: gross, userShare, platformShare });

  res.send("OK - 70/30 Credited");
});

// ===== TimeWall postback =====
// Example: /api/v1/postback/timewall?userid={userID}&txid={transactionID}&revenue={revenue}&currency={currencyAmount}&hash={hash}&type={type}
router.get('/timewall', async (req,res)=>{
  try{
    const { userid, txid, revenue, hash, type } = req.query;

    if(!userid || !txid || !revenue || !hash){
      return res.status(400).send("Missing params");
    }

    // 1) Verify hash: sha256(userID + revenue + SecretKey)
    const secret = process.env.TIMEWALL_SECRET_KEY;
    const expectedHash = crypto
      .createHash('sha256')
      .update(`${userid}${revenue}${secret}`)
      .digest('hex');

    if(expectedHash !== hash){
      return res.status(403).send("Invalid hash");
    }

    // 2) Block duplicates (use a prefixed txId so it never collides with other networks)
    const txId = `timewall_${txid}`;
    const dup = await Transaction.findOne({ txId });
    if(dup) return res.status(409).send("Duplicate blocked");

    // 3) Handle reversals/chargebacks — don't credit, just log
    if(type && type.toLowerCase() !== 'confirmed' && type.toLowerCase() !== 'credit'){
      await Transaction.create({ txId, userId: userid, grossAmount: 0, userShare: 0, platformShare: 0, note: `timewall type=${type} skipped` });
      return res.send("1");
    }

    // 4) Credit 70/30 split
    const gross = parseFloat(revenue);
    const userShare = gross * 0.70;
    const platformShare = gross * 0.30;

    await User.findByIdAndUpdate(userid, { $inc: { balanceUSD: userShare } });
    await Transaction.create({ txId, userId: userid, grossAmount: gross, userShare, platformShare, source: 'timewall' });

    // TimeWall expects a plain success response
    res.send("1");
  }catch(e){
    console.error('TimeWall postback error:', e.message);
    res.status(500).send("Error");
  }
});

module.exports = router;

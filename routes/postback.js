const express = require('express');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const router = express.Router();

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

module.exports = router;

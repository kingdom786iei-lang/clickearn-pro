const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

router.post('/check-email', (req,res)=>{
  const isAdmin = req.body.email.toLowerCase() === process.env.MASTER_ADMIN_EMAIL.toLowerCase();
  res.json({ isAdminEmail: isAdmin, showPinField: isAdmin });
});

router.post('/login', async (req,res)=>{
  const { email, password, adminPin } = req.body;
  const isMaster = email.toLowerCase() === process.env.MASTER_ADMIN_EMAIL.toLowerCase();
  
  if(isMaster){
    if(adminPin !== process.env.MASTER_ADMIN_PIN) return res.status(403).json({ error: "PIN required", showPinField: true });
    let admin = await User.findOne({ email });
    if(!admin){
      const hash = await bcrypt.hash(password, 10);
      admin = await User.create({ email, passwordHash: hash, role: 'admin' });
    }
    const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET);
    return res.json({ token, role: 'admin', isAdmin: true });
  }
  
  const user = await User.findOne({ email: email.toLowerCase() });
  if(!user) return res.status(404).json({error:"Not found"});
  if(user.isBanned) return res.status(403).json({error:"Banned"});
  
  const ok = await bcrypt.compare(password, user.passwordHash);
  if(!ok) return res.status(401).json({error:"Wrong pass"});
  
  const token = jwt.sign({ id: user._id, role: 'user' }, process.env.JWT_SECRET);
  res.json({ token, userId: user._id, balanceUSD: user.balanceUSD });
});

router.post('/register', async (req,res)=>{
  const { email, password } = req.body;
  if(email.toLowerCase() === process.env.MASTER_ADMIN_EMAIL.toLowerCase()) return res.status(403).json({error:"Reserved"});
  
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ email: email.toLowerCase(), passwordHash: hash });
  
  const token = jwt.sign({ id: user._id, role: 'user' }, process.env.JWT_SECRET);
  res.json({ token, userId: user._id, balanceUSD: user.balanceUSD });
});

module.exports = router;

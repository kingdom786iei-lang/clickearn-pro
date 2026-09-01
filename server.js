require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const requestIp = require('request-ip');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(requestIp.mw());

mongoose.connect(process.env.MONGO_URI).then(()=> console.log("MongoDB Connected"));

app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/ads', require('./routes/ads'));
app.use('/api/v1/postback', require('./routes/postback'));
app.use('/api/v1/withdrawals', require('./routes/withdrawals'));
app.use('/api/v1/admin', require('./routes/admin'));
app.use('/api/v1/users', require('./routes/users'));

app.get('/', (req,res)=> res.send('ClickEarn Pro API Running'));

app.listen(process.env.PORT || 5000);

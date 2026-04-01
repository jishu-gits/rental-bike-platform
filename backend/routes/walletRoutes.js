const express = require('express');
const router = express.Router();
const Wallet = require('../models/Wallet');
const authMiddleware = require('../middleware/authMiddleware');

// ─── GET /api/wallet ──────────────────────────────────────────────────────────
router.get('/', authMiddleware(), async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ userId: req.user.id });
    if (!wallet) {
      wallet = await Wallet.create({ userId: req.user.id, balance: 0, transactions: [] });
    }
    const last10 = [...wallet.transactions].reverse().slice(0, 10);
    res.json({ success: true, balance: wallet.balance, transactions: last10 });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/wallet/topup ───────────────────────────────────────────────────
router.post('/topup', authMiddleware(), async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 1) return res.status(400).json({ success: false, message: 'Invalid amount' });

    let wallet = await Wallet.findOne({ userId: req.user.id });
    if (!wallet) wallet = new Wallet({ userId: req.user.id, balance: 0 });

    wallet.balance += Number(amount);
    wallet.transactions.push({ type: 'credit', amount: Number(amount), description: 'Wallet top-up' });
    await wallet.save();

    res.json({ success: true, balance: wallet.balance, message: `₹${amount} added to wallet` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

// RidePulse — Wallet balance and top-up routes
const express = require('express');
const router = express.Router();
const Wallet = require('../models/Wallet');
const authMiddleware = require('../middleware/authMiddleware');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// ─── GET /api/wallet ──────────────────────────────────────────────────────────
router.get('/', authMiddleware(), catchAsync(async (req, res) => {
  let wallet = await Wallet.findOne({ userId: req.user.id });
  if (!wallet) {
    wallet = await Wallet.create({ userId: req.user.id, balance: 0, transactions: [] });
  }
  const last10 = [...wallet.transactions].reverse().slice(0, 10);
  res.json({ success: true, balance: wallet.balance, transactions: last10 });
}));

// ─── POST /api/wallet/topup ───────────────────────────────────────────────────
router.post('/topup', authMiddleware(), catchAsync(async (req, res, next) => {
  const { amount } = req.body;
  const parsed = Number(amount);
  if (!amount || isNaN(parsed) || parsed < 1) {
    return next(new AppError('Amount must be a positive number (minimum ₹1)', 400));
  }

  let wallet = await Wallet.findOne({ userId: req.user.id });
  if (!wallet) wallet = new Wallet({ userId: req.user.id, balance: 0 });

  wallet.balance += parsed;
  wallet.transactions.push({ type: 'credit', amount: parsed, description: 'Wallet top-up' });
  await wallet.save();

  res.json({ success: true, balance: wallet.balance, message: `₹${parsed} added to wallet` });
}));

module.exports = router;

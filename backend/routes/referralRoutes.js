// RidePulse — Referral code retrieval and application routes
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const authMiddleware = require('../middleware/authMiddleware');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// ─── GET /api/referral/code ───────────────────────────────────────────────────
router.get('/code', authMiddleware(), catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError('User not found', 404));

  const wallet = await Wallet.findOne({ userId: req.user.id });
  const referralEarnings = wallet
    ? wallet.transactions
        .filter((t) => t.type === 'credit' && t.description?.includes('Referral bonus'))
        .reduce((sum, t) => sum + t.amount, 0)
    : 0;

  res.json({
    success: true,
    referralCode: user.referralCode,
    referralCount: user.referralCount || 0,
    totalEarned: referralEarnings,
  });
}));

// ─── POST /api/referral/apply ─────────────────────────────────────────────────
router.post('/apply', authMiddleware(), catchAsync(async (req, res, next) => {
  const { code } = req.body;
  if (!code) return next(new AppError('Referral code is required', 400));

  const currentUser = await User.findById(req.user.id);
  if (currentUser.referredBy) {
    return next(new AppError('You have already used a referral code', 400));
  }

  const referrer = await User.findOne({ referralCode: code.toUpperCase() });
  if (!referrer) return next(new AppError('Invalid referral code', 404));
  if (referrer._id.toString() === req.user.id) {
    return next(new AppError('You cannot use your own referral code', 400));
  }

  currentUser.referredBy = referrer._id;
  await currentUser.save();

  referrer.referralCount = (referrer.referralCount || 0) + 1;
  await referrer.save();

  // Credit ₹150 to referrer
  let referrerWallet = await Wallet.findOne({ userId: referrer._id });
  if (!referrerWallet) referrerWallet = new Wallet({ userId: referrer._id, balance: 0 });
  referrerWallet.balance += 150;
  referrerWallet.transactions.push({ type: 'credit', amount: 150, description: `Referral bonus — ${currentUser.name} applied your code` });
  await referrerWallet.save();

  // Credit ₹150 to current user
  let myWallet = await Wallet.findOne({ userId: req.user.id });
  if (!myWallet) myWallet = new Wallet({ userId: req.user.id, balance: 0 });
  myWallet.balance += 150;
  myWallet.transactions.push({ type: 'credit', amount: 150, description: 'Referral bonus applied' });
  await myWallet.save();

  res.json({ success: true, message: '₹150 added to your wallet and ₹150 to the referrer.' });
}));

module.exports = router;

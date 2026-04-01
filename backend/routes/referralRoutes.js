const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const authMiddleware = require('../middleware/authMiddleware');

// ─── GET /api/referral/code ───────────────────────────────────────────────────
router.get('/code', authMiddleware(), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

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
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/referral/apply ─────────────────────────────────────────────────
router.post('/apply', authMiddleware(), async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Referral code required' });

    const currentUser = await User.findById(req.user.id);
    if (currentUser.referredBy) return res.status(400).json({ success: false, message: 'You have already used a referral code.' });

    const referrer = await User.findOne({ referralCode: code.toUpperCase() });
    if (!referrer) return res.status(404).json({ success: false, message: 'Invalid referral code' });
    if (referrer._id.toString() === req.user.id) return res.status(400).json({ success: false, message: 'You cannot use your own referral code.' });

    // Apply referral
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
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;

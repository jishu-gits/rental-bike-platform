const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, referralCode } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ success: false, message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Resolve referrer
    let referredBy = null;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
      if (referrer) referredBy = referrer._id;
    }

    user = new User({ name, email, password: passwordHash, role: role || 'customer', referredBy });
    await user.save();

    // Credit referral bonus if valid
    if (referredBy) {
      const referrer = await User.findById(referredBy);
      if (referrer) {
        referrer.referralCount = (referrer.referralCount || 0) + 1;
        await referrer.save();

        // Credit ₹150 to referrer wallet
        let referrerWallet = await Wallet.findOne({ userId: referredBy });
        if (!referrerWallet) referrerWallet = new Wallet({ userId: referredBy, balance: 0 });
        referrerWallet.balance += 150;
        referrerWallet.transactions.push({ type: 'credit', amount: 150, description: `Referral bonus — ${name} joined` });
        await referrerWallet.save();
      }

      // Credit ₹150 to new user wallet
      let newUserWallet = new Wallet({ userId: user._id, balance: 150 });
      newUserWallet.transactions.push({ type: 'credit', amount: 150, description: 'Welcome bonus — referral applied' });
      await newUserWallet.save();
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, referralCode: user.referralCode },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// ─── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, referralCode: user.referralCode },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// ─── POST /api/auth/become-provider ─────────────────────────────────────────
router.post('/become-provider', authMiddleware(), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { role: 'provider' }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, referralCode: user.referralCode },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

module.exports = router;

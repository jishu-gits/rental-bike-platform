// RidePulse — Authentication routes: register, login, verify email, verify phone, become-provider
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validations/auth.validation');
const { sendEmail, verifyEmailTemplate } = require('../utils/email');
const { generateOTP, sendOTP, saveOTP, verifyOTP } = require('../utils/otp');
const rateLimit = require('express-rate-limit');

// Strict limiter for OTP resend (3 attempts per 10 minutes)
const otpResendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: { success: false, message: 'Too many OTP requests. Please wait 10 minutes.' },
});

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post(
  '/register',
  validate(registerSchema),
  catchAsync(async (req, res, next) => {
    const { name, email, password, phone, role, referralCode } = req.body;

    // Check for duplicate email early — clearer message before hashing
    const existing = await User.findOne({ email });
    if (existing) return next(new AppError('An account with this email already exists', 409));

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Resolve referrer
    let referredBy = null;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
      if (referrer) referredBy = referrer._id;
    }

    const user = new User({
      name,
      email,
      password: passwordHash,
      role: role || 'customer',
      phone: phone || null,
      referredBy,
      emailVerified: false,
      phoneVerified: false,
    });
    await user.save();

    // Credit referral bonuses
    if (referredBy) {
      const referrer = await User.findById(referredBy);
      if (referrer) {
        referrer.referralCount = (referrer.referralCount || 0) + 1;
        await referrer.save();

        let referrerWallet = await Wallet.findOne({ userId: referredBy });
        if (!referrerWallet) referrerWallet = new Wallet({ userId: referredBy, balance: 0 });
        referrerWallet.balance += 150;
        referrerWallet.transactions.push({ type: 'credit', amount: 150, description: `Referral bonus — ${name} joined` });
        await referrerWallet.save();
      }
      const newUserWallet = new Wallet({ userId: user._id, balance: 150 });
      newUserWallet.transactions.push({ type: 'credit', amount: 150, description: 'Welcome bonus — referral applied' });
      await newUserWallet.save();
    }

    // Send email verification
    try {
      const verifyToken = jwt.sign({ id: user._id }, process.env.EMAIL_VERIFY_SECRET || process.env.JWT_SECRET, { expiresIn: '24h' });
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verifyToken}`;
      await sendEmail({
        to: email,
        subject: 'Verify your RidePulse account',
        html: verifyEmailTemplate(name, verificationUrl),
      });
    } catch (emailErr) {
      // Non-fatal: user is created; just couldn't send email
      console.error('Email send failed (registration):', emailErr.message);
    }

    // Send phone OTP if phone provided
    if (phone) {
      try {
        const otp = generateOTP();
        await saveOTP(phone, otp);
        await sendOTP(phone, otp);
      } catch (otpErr) {
        console.error('OTP send failed:', otpErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Check your email to verify your account.',
    });
  })
);

// ─── GET /api/auth/verify-email/:token ───────────────────────────────────────
router.get(
  '/verify-email/:token',
  catchAsync(async (req, res, next) => {
    const { token } = req.params;
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.EMAIL_VERIFY_SECRET || process.env.JWT_SECRET);
    } catch {
      return next(new AppError('Verification link is invalid or has expired. Please register again or request a new link.', 400));
    }

    const user = await User.findById(decoded.id);
    if (!user) return next(new AppError('User not found', 404));
    if (user.emailVerified) {
      return res.json({ success: true, message: 'Email already verified. Please log in.' });
    }

    user.emailVerified = true;
    await user.save();

    const sessionToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      success: true,
      message: 'Email verified successfully. You are now logged in.',
      token: sessionToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, referralCode: user.referralCode },
    });
  })
);

// ─── POST /api/auth/verify-phone ─────────────────────────────────────────────
router.post(
  '/verify-phone',
  authMiddleware(),
  catchAsync(async (req, res, next) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) return next(new AppError('Phone number and OTP are required', 400));

    const result = await verifyOTP(phone, otp);
    if (!result.success) return next(new AppError(result.message, 400));

    await User.findByIdAndUpdate(req.user.id, { phoneVerified: true, phone });
    res.json({ success: true, message: 'Phone number verified successfully.' });
  })
);

// ─── POST /api/auth/resend-otp ────────────────────────────────────────────────
router.post(
  '/resend-otp',
  authMiddleware(),
  otpResendLimiter,
  catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (!user) return next(new AppError('User not found', 404));
    if (!user.phone) return next(new AppError('No phone number on your account', 400));
    if (user.phoneVerified) return next(new AppError('Phone is already verified', 400));

    const otp = generateOTP();
    await saveOTP(user.phone, otp);
    await sendOTP(user.phone, otp);

    res.json({ success: true, message: 'OTP resent successfully.' });
  })
);

// ─── POST /api/auth/login ────────────────────────────────────────────────────
router.post(
  '/login',
  validate(loginSchema),
  catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return next(new AppError('Invalid email or password', 401));

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return next(new AppError('Invalid email or password', 401));

    // Block login if email not verified
    if (!user.emailVerified) {
      return next(new AppError('Please verify your email before logging in. Check your inbox.', 403));
    }

    if (user.suspended) {
      return next(new AppError('Your account has been suspended. Please contact support.', 403));
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, referralCode: user.referralCode },
    });
  })
);

// ─── POST /api/auth/become-provider ─────────────────────────────────────────
router.post(
  '/become-provider',
  authMiddleware(),
  catchAsync(async (req, res, next) => {
    const user = await User.findByIdAndUpdate(req.user.id, { role: 'provider' }, { new: true });
    if (!user) return next(new AppError('User not found', 404));

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, referralCode: user.referralCode },
    });
  })
);

module.exports = router;

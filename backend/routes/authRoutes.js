// RidePulse — Auth routes with email verification + mobile OTP login
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const authMiddleware = require('../middleware/authMiddleware');
const { sendEmail } = require('../utils/email');
const { generateOTP, saveOTP, sendOTP, verifyOTP } = require('../utils/otp');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validations/auth.validation');

// ─── REGISTER ───────────────────────────────────────────────
router.post('/register', validate(registerSchema), catchAsync(async (req, res, next) => {
  const { name, email, password, phone, role } = req.body;

  const existingEmail = await User.findOne({ email });
  if (existingEmail) throw new AppError('An account with this email already exists', 409);

  if (phone) {
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) throw new AppError('An account with this phone number already exists', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    phone: phone || null,
    role: role || 'customer',
    emailVerified: false,
    phoneVerified: false,
  });

  // Send email verification
  try {
    const verifyToken = jwt.sign(
      { id: user._id },
      process.env.EMAIL_VERIFY_SECRET,
      { expiresIn: '24h' }
    );
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verifyToken}`;

    await sendEmail({
      to: email,
      subject: 'Verify your RidePulse account',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #00cc66;">Welcome to RidePulse, ${name}!</h2>
          <p>Click the button below to verify your email address.</p>
          <a href="${verifyUrl}" style="
            display: inline-block;
            background: #00cc66;
            color: #000;
            padding: 14px 28px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin: 16px 0;
          ">Verify Email</a>
          <p style="color: #888; font-size: 13px;">
            This link expires in 24 hours. If you didn't create an account, ignore this email.
          </p>
        </div>
      `,
    });
  } catch (emailErr) {
    console.error('Verification email failed:', emailErr.message);
    // Don't block registration if email fails
  }

  // Send phone OTP if phone provided
  if (phone) {
    try {
      const otp = generateOTP();
      await saveOTP(phone, otp);
      await sendOTP(phone, otp);
    } catch (smsErr) {
      console.error('OTP send failed:', smsErr.message);
    }
  }

  res.status(201).json({
    success: true,
    message: phone
      ? 'Account created. Check your email and phone for verification codes.'
      : 'Account created. Check your email to verify your account.',
  });
}));

// ─── VERIFY EMAIL ────────────────────────────────────────────
router.get('/verify-email', catchAsync(async (req, res, next) => {
  const { token } = req.query;
  if (!token) throw new AppError('Verification token is missing', 400);

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.EMAIL_VERIFY_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Verification link has expired. Please request a new one.', 400);
    }
    throw new AppError('Invalid verification link', 400);
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new AppError('Account not found', 404);

  if (user.emailVerified) {
    return res.redirect(`${process.env.FRONTEND_URL}/login?message=already_verified`);
  }

  user.emailVerified = true;
  await user.save();

  res.redirect(`${process.env.FRONTEND_URL}/login?message=email_verified`);
}));

// ─── RESEND VERIFICATION EMAIL ───────────────────────────────
router.post('/resend-verification', catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email) throw new AppError('Email is required', 400);

  const user = await User.findOne({ email });
  if (!user) throw new AppError('No account found with this email', 404);
  if (user.emailVerified) throw new AppError('Email is already verified', 400);

  const verifyToken = jwt.sign(
    { id: user._id },
    process.env.EMAIL_VERIFY_SECRET,
    { expiresIn: '24h' }
  );
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verifyToken}`;

  await sendEmail({
    to: email,
    subject: 'Verify your RidePulse account',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #00cc66;">Verify your email</h2>
        <p>Click below to verify your RidePulse account.</p>
        <a href="${verifyUrl}" style="
          display: inline-block;
          background: #00cc66;
          color: #000;
          padding: 14px 28px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          margin: 16px 0;
        ">Verify Email</a>
        <p style="color: #888; font-size: 13px;">This link expires in 24 hours.</p>
      </div>
    `,
  });

  res.json({ success: true, message: 'Verification email sent. Check your inbox.' });
}));

// ─── LOGIN WITH EMAIL + PASSWORD ─────────────────────────────
router.post('/login', validate(loginSchema), catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) throw new AppError('Invalid email or password', 401);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new AppError('Invalid email or password', 401);

  // Allow login regardless of email verification
  // Just attach a warning flag if not verified
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

  res.json({
    success: true,
    token,
    emailVerified: user.emailVerified,
    emailWarning: !user.emailVerified
      ? 'Please verify your email to secure your account.'
      : null,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      kycVerified: user.kycVerified || false,
    },
  });
}));

// ─── REQUEST PHONE OTP ────────────────────────────────────────
router.post('/request-otp', catchAsync(async (req, res, next) => {
  const { phone } = req.body;
  if (!phone) throw new AppError('Phone number is required', 400);

  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw new AppError('Enter a valid 10-digit Indian mobile number', 400);
  }

  const user = await User.findOne({ phone });
  if (!user) {
    throw new AppError('No account found with this number. Please register first.', 404);
  }

  const otp = generateOTP();
  await saveOTP(phone, otp);

  try {
    await sendOTP(phone, otp);
  } catch (err) {
    throw new AppError('Failed to send OTP. Please try again.', 500);
  }

  res.json({ success: true, message: `OTP sent to +91 ${phone}` });
}));

// ─── LOGIN WITH PHONE OTP ─────────────────────────────────────
router.post('/login-otp', catchAsync(async (req, res, next) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) throw new AppError('Phone number and OTP are required', 400);

  const valid = await verifyOTP(phone, otp);
  if (!valid) throw new AppError('Invalid or expired OTP. Please try again.', 400);

  const user = await User.findOne({ phone });
  if (!user) throw new AppError('Account not found', 404);

  // OTP login also marks phone as verified
  if (!user.phoneVerified) {
    user.phoneVerified = true;
    await user.save();
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

  res.json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      emailVerified: user.emailVerified,
      phoneVerified: true,
      kycVerified: user.kycVerified || false,
    },
  });
}));

// ─── VERIFY PHONE OTP (for account page) ─────────────────────
router.post('/verify-phone', authMiddleware(), catchAsync(async (req, res, next) => {
  const { otp } = req.body;
  const user = await User.findById(req.user.id);

  if (!user.phone) throw new AppError('No phone number linked to this account', 400);
  if (user.phoneVerified) throw new AppError('Phone is already verified', 400);

  const valid = await verifyOTP(user.phone, otp);
  if (!valid) throw new AppError('Invalid or expired OTP', 400);

  user.phoneVerified = true;
  await user.save();

  res.json({ success: true, message: 'Phone number verified successfully' });
}));

// ─── RESEND PHONE OTP ─────────────────────────────────────────
router.post('/resend-phone-otp', authMiddleware(), catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user.phone) throw new AppError('No phone number on your account', 400);
  if (user.phoneVerified) throw new AppError('Phone is already verified', 400);

  const otp = generateOTP();
  await saveOTP(user.phone, otp);
  await sendOTP(user.phone, otp);

  res.json({ success: true, message: 'OTP resent to your phone' });
}));

module.exports = router;

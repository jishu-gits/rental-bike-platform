// RidePulse — Admin-only backend routes for dashboard, user/bike/KYC/booking/support management
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Bike = require('../models/Bike');
const Booking = require('../models/Booking');
const KYC = require('../models/KYC');
const SupportTicket = require('../models/SupportTicket');
const Payment = require('../models/Payment');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendEmail } = require('../utils/email');

// All admin routes require auth + admin role
router.use(authMiddleware(), adminMiddleware);

// ─── GET /api/admin/dashboard ─────────────────────────────────────────────────
router.get('/dashboard', catchAsync(async (req, res) => {
  const [
    totalUsers,
    totalBikes,
    totalBookings,
    pendingKYC,
    openSupportTickets,
    revenueResult,
    recentBookings,
  ] = await Promise.all([
    User.countDocuments(),
    Bike.countDocuments(),
    Booking.countDocuments(),
    KYC.countDocuments({ status: 'pending' }),
    SupportTicket.countDocuments({ status: 'open' }),
    Payment.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Booking.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('customerId', 'name email')
      .populate('bikeId', 'brand model'),
  ]);

  const totalRevenue = revenueResult[0]?.total || 0; // in paise

  res.json({
    success: true,
    totalUsers,
    totalBikes,
    totalBookings,
    totalRevenue,
    pendingKYC,
    openSupportTickets,
    recentBookings,
  });
}));

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
router.get('/users', catchAsync(async (req, res) => {
  const { page = 1, limit = 20, role, search } = req.query;
  const query = {};
  if (role) query.role = role;
  if (search) query.$or = [
    { name: new RegExp(search, 'i') },
    { email: new RegExp(search, 'i') },
  ];

  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .select('-password')
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    users,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit),
  });
}));

// ─── PATCH /api/admin/users/:id/suspend ──────────────────────────────────────
router.patch('/users/:id/suspend', catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { suspended: true },
    { new: true }
  ).select('-password');
  if (!user) return next(new AppError('User not found', 404));

  const io = req.app.get('io');
  try {
    const { notify } = require('../utils/notify');
    await notify(io, user._id, 'account_suspended',
      'Your account has been suspended. Please contact support for assistance.');
  } catch (_) {}

  res.json({ success: true, message: `User ${user.email} suspended.`, user });
}));

// ─── GET /api/admin/kyc ───────────────────────────────────────────────────────
router.get('/kyc', catchAsync(async (req, res) => {
  const { status = 'pending' } = req.query;
  const kycList = await KYC.find({ status }).populate('userId', 'name email').sort({ submittedAt: -1 });
  res.json({ success: true, kycList });
}));

// ─── PATCH /api/admin/kyc/:id/approve ────────────────────────────────────────
router.patch('/kyc/:id/approve', catchAsync(async (req, res, next) => {
  const kyc = await KYC.findByIdAndUpdate(
    req.params.id,
    { status: 'verified', reviewedAt: new Date() },
    { new: true }
  ).populate('userId', 'name email');
  if (!kyc) return next(new AppError('KYC record not found', 404));

  // Notify user
  const io = req.app.get('io');
  try {
    const { notify } = require('../utils/notify');
    await notify(io, kyc.userId._id, 'kyc_approved', '🎉 Your KYC is approved! You can now book bikes.');
    await sendEmail({
      to: kyc.userId.email,
      subject: 'KYC Approved — RidePulse',
      html: `<p>Hi ${kyc.userId.name},</p><p>Your KYC verification has been <strong>approved</strong>. You can now book bikes on RidePulse.</p>`,
    });
  } catch (_) {}

  res.json({ success: true, message: 'KYC approved', kyc });
}));

// ─── PATCH /api/admin/kyc/:id/reject ─────────────────────────────────────────
router.patch('/kyc/:id/reject', catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  const kyc = await KYC.findByIdAndUpdate(
    req.params.id,
    { status: 'rejected', rejectionReason: reason || 'Documents could not be verified', reviewedAt: new Date() },
    { new: true }
  ).populate('userId', 'name email');
  if (!kyc) return next(new AppError('KYC record not found', 404));

  const io = req.app.get('io');
  try {
    const { notify } = require('../utils/notify');
    await notify(io, kyc.userId._id, 'kyc_rejected',
      `Your KYC was rejected: ${reason || 'Documents could not be verified'}. Please resubmit.`);
    await sendEmail({
      to: kyc.userId.email,
      subject: 'KYC Rejected — RidePulse',
      html: `<p>Hi ${kyc.userId.name},</p><p>Your KYC was <strong>rejected</strong>. Reason: ${reason || 'Documents could not be verified'}. Please resubmit with clearer documents.</p>`,
    });
  } catch (_) {}

  res.json({ success: true, message: 'KYC rejected', kyc });
}));

// ─── GET /api/admin/bikes ─────────────────────────────────────────────────────
router.get('/bikes', catchAsync(async (req, res) => {
  const query = {};
  if (req.query.flagged === 'true') query.flagged = true;
  const bikes = await Bike.find(query).populate('providerId', 'name email').sort({ createdAt: -1 });
  res.json({ success: true, bikes });
}));

// ─── PATCH /api/admin/bikes/:id/remove ───────────────────────────────────────
router.patch('/bikes/:id/remove', catchAsync(async (req, res, next) => {
  const bike = await Bike.findByIdAndUpdate(
    req.params.id,
    { removed: true, isAvailable: false },
    { new: true }
  ).populate('providerId', '_id');
  if (!bike) return next(new AppError('Bike not found', 404));

  const io = req.app.get('io');
  try {
    const { notify } = require('../utils/notify');
    await notify(io, bike.providerId._id, 'listing_removed',
      `Your listing "${bike.brand} ${bike.model}" has been removed by admin.`);
  } catch (_) {}

  res.json({ success: true, message: 'Bike listing removed', bike });
}));

// ─── GET /api/admin/support-tickets ──────────────────────────────────────────
router.get('/support-tickets', catchAsync(async (req, res) => {
  const { status = 'open' } = req.query;
  const tickets = await SupportTicket.find({ status })
    .populate('userId', 'name email')
    .sort({ createdAt: -1 });
  res.json({ success: true, tickets });
}));

// ─── PATCH /api/admin/support-tickets/:id/resolve ────────────────────────────
router.patch('/support-tickets/:id/resolve', catchAsync(async (req, res, next) => {
  const { resolution } = req.body;
  const ticket = await SupportTicket.findByIdAndUpdate(
    req.params.id,
    { status: 'resolved', resolution: resolution || 'Issue resolved by support team', resolvedAt: new Date() },
    { new: true }
  ).populate('userId', 'name email _id');
  if (!ticket) return next(new AppError('Support ticket not found', 404));

  const io = req.app.get('io');
  try {
    const { notify } = require('../utils/notify');
    await notify(io, ticket.userId._id, 'ticket_resolved',
      `Your support ticket "${ticket.subject}" has been resolved.`);
  } catch (_) {}

  res.json({ success: true, message: 'Ticket resolved', ticket });
}));

// ─── GET /api/admin/bookings ──────────────────────────────────────────────────
router.get('/bookings', catchAsync(async (req, res) => {
  const query = {};
  if (req.query.status) query.status = req.query.status;
  const bookings = await Booking.find(query)
    .populate('customerId', 'name email')
    .populate({ path: 'bikeId', populate: { path: 'providerId', select: 'name email' } })
    .sort({ createdAt: -1 });
  res.json({ success: true, bookings });
}));

module.exports = router;

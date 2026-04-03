// RidePulse — Booking creation, listing, and cancellation routes with concurrency guard
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Bike = require('../models/Bike');
const KYC = require('../models/KYC');
const Wallet = require('../models/Wallet');
const authMiddleware = require('../middleware/authMiddleware');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const validate = require('../middleware/validate');
const { createBookingSchema, objectIdParamSchema } = require('../validations/booking.validation');
const { geocodeCity, calculateDistanceKm } = require('../utils/geocode');

// ─── Helper: compute cost based on planType ───────────────────────────────────
function computeCost(pricePerDay, planType, startDate, endDate, hours = 0) {
  switch (planType) {
    case 'hourly': {
      const h = hours || Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 3600000));
      return Math.round((pricePerDay / 24) * h);
    }
    case 'weekly': {
      const days = Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000));
      const weeks = Math.max(1, Math.ceil(days / 7));
      return Math.round(pricePerDay * 7 * weeks * 0.85);
    }
    case 'monthly': {
      const days = Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000));
      const months = Math.max(1, Math.ceil(days / 30));
      return Math.round(pricePerDay * 30 * months * 0.70);
    }
    default: { // daily
      const days = Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000));
      return Math.round(pricePerDay * days);
    }
  }
}

// ─── POST /api/bookings ───────────────────────────────────────────────────────
router.post(
  '/',
  authMiddleware(),
  validate(createBookingSchema),
  catchAsync(async (req, res, next) => {
    const { planType, bikeId, deliveryType, useWallet } = req.body;

    let startDate, endDate;

    if (planType === 'hourly') {
      const { date, startTime, durationHours } = req.body;
      // Build startDate from date + startTime
      startDate = new Date(`${date}T${startTime}:00`);
      // Auto-calculate endDate
      endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);
    } else {
      startDate = new Date(req.body.startDate);
      endDate = new Date(req.body.endDate);
    }

    // KYC check
    const kyc = await KYC.findOne({ userId: req.user.id });
    if (!kyc || kyc.status !== 'verified') {
      return next(new AppError('KYC verification is required before booking', 403));
    }

    // Bike availability
    const bike = await Bike.findById(bikeId);
    if (!bike || !bike.isAvailable || !bike.isApproved) {
      return next(new AppError('This bike is not available for booking', 400));
    }

    // Cost calculation
    let totalCost;
    if (planType === 'hourly') {
      totalCost = Math.round((bike.pricePerDay / 24) * req.body.durationHours);
    } else if (planType === 'daily') {
      const days = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)));
      totalCost = Math.round(bike.pricePerDay * days);
    } else if (planType === 'weekly') {
      const days = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)));
      totalCost = Math.round(bike.pricePerDay * days * 0.85);
    } else if (planType === 'monthly') {
      const days = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)));
      totalCost = Math.round(bike.pricePerDay * days * 0.70);
    }

    // Distance-based doorstep delivery fee
    let deliveryFee = 0;
    if (deliveryType === 'doorstep') {
      if (!deliveryAddress?.city) {
        return next(new AppError('Delivery city is required for doorstep delivery', 400));
      }
      if (bike.coordinates?.lat && bike.coordinates?.lng) {
        try {
          const destCoords = await geocodeCity(deliveryAddress.city);
          const distKm = calculateDistanceKm(
            bike.coordinates.lat, bike.coordinates.lng,
            destCoords.lat, destCoords.lng
          );
          if (distKm > 30) {
            return next(new AppError('Doorstep delivery is not available beyond 30km', 400));
          }
          if (distKm <= 5)  deliveryFee = 30;
          else if (distKm <= 15) deliveryFee = 60;
          else deliveryFee = 100;
        } catch (_) {
          deliveryFee = 50; // fallback flat fee if geocoding fails
        }
      } else {
        deliveryFee = 50; // flat fee if bike has no coordinates
      }
      totalCost += deliveryFee;
    }

    // ── Atomic session: overlap check + booking creation + wallet deduction ──
    const session = await mongoose.startSession();
    let booking;
    try {
      await session.withTransaction(async () => {
        // Concurrency guard: reject overlapping bookings for the same bike
        const conflict = await Booking.findOne({
          bikeId,
          status: { $in: ['pending', 'pending_payment', 'confirmed'] },
          $or: [{ startDate: { $lt: new Date(endDate) }, endDate: { $gt: new Date(startDate) } }],
        }).session(session);

        if (conflict) {
          throw new AppError('This bike is already booked for the selected dates', 409);
        }

        // Wallet deduction (atomic)
        let walletDeducted = 0;
        if (useWallet) {
          const wallet = await Wallet.findOne({ userId: req.user.id }).session(session);
          if (wallet && wallet.balance > 0) {
            walletDeducted = Math.min(wallet.balance, totalCost);
            wallet.balance -= walletDeducted;
            wallet.transactions.push({
              type: 'debit',
              amount: walletDeducted,
              description: `Booking: ${bike.brand} ${bike.model}`,
            });
            await wallet.save({ session });
          }
        }

        const initialStatus = walletDeducted >= totalCost ? 'confirmed' : 'pending_payment';

        [booking] = await Booking.create([{
          bikeId,
          customerId: req.user.id,
          planType,
          startDate,
          endDate,
          hours: planType === 'hourly' ? req.body.durationHours : 0,
          totalCost,
          status: initialStatus,
          deliveryType,
          deliveryAddress: deliveryType === 'doorstep' ? req.body.deliveryAddress : {},
          deliverySlot: deliveryType === 'doorstep' ? req.body.deliverySlot : '',
          useWallet,
          walletDeducted,
        }], { session });
      });
    } finally {
      await session.endSession();
    }

    // Notify customer and provider (non-blocking)
    const io = req.app.get('io');
    try {
      const { notify } = require('../utils/notify');
      await notify(io, req.user.id, 'booking_confirmed',
        `Your booking for ${bike.brand} ${bike.model} is confirmed! Total: ₹${totalCost.toLocaleString('en-IN')}`);
      await notify(io, bike.providerId, 'new_booking',
        `New booking on your ${bike.brand} ${bike.model} from ${new Date(startDate).toLocaleDateString('en-IN')}`);
    } catch (_) {}

    res.status(201).json({ success: true, data: booking, deliveryFee });
  })
);

// ─── GET /api/bookings/my-bookings ───────────────────────────────────────────
router.get('/my-bookings', authMiddleware(), catchAsync(async (req, res) => {
  const bookings = await Booking.find({ customerId: req.user.id })
    .populate('bikeId')
    .sort({ createdAt: -1 });
  res.json(bookings);
}));

// ─── GET /api/bookings/provider ──────────────────────────────────────────────
router.get('/provider', authMiddleware(['provider']), catchAsync(async (req, res) => {
  const bikes = await Bike.find({ providerId: req.user.id });
  const bikeIds = bikes.map((b) => b._id);
  const bookings = await Booking.find({ bikeId: { $in: bikeIds } })
    .populate('customerId', 'name email')
    .populate('bikeId', 'brand model city')
    .sort({ createdAt: -1 });
  res.json(bookings);
}));

// ─── Backward-compat alias ───────────────────────────────────────────────────
router.get('/provider-bookings', authMiddleware(['provider']), catchAsync(async (req, res) => {
  const bikes = await Bike.find({ providerId: req.user.id });
  const bikeIds = bikes.map((b) => b._id);
  const bookings = await Booking.find({ bikeId: { $in: bikeIds } })
    .populate('customerId', 'name email')
    .populate('bikeId', 'brand model')
    .sort({ createdAt: -1 });
  res.json(bookings);
}));

// ─── PATCH /api/bookings/:id/cancel ──────────────────────────────────────────
router.patch(
  '/:id/cancel',
  authMiddleware(),
  validate(objectIdParamSchema, 'params'),
  catchAsync(async (req, res, next) => {
    const booking = await Booking.findOne({ _id: req.params.id, customerId: req.user.id })
      .populate('bikeId');

    if (!booking) return next(new AppError('Booking not found', 404));
    if (booking.status === 'cancelled') return next(new AppError('This booking is already cancelled', 400));
    if (booking.status === 'completed') return next(new AppError('Cannot cancel a completed booking', 400));

    const now = new Date();
    const start = new Date(booking.startDate);
    if (start < now) return next(new AppError('Cannot cancel a booking that has already started', 400));

    const hoursUntilStart = (start - now) / 3600000;
    if (hoursUntilStart < 24) {
      return next(new AppError('Cancellations must be made at least 24 hours before pickup', 400));
    }

    // Refund policy
    let refundPercent = hoursUntilStart >= 48 ? 100 : 50;
    const refundAmount = Math.round((booking.totalCost * refundPercent) / 100);

    booking.status = 'cancelled';
    booking.cancelledAt = now;
    booking.refundAmount = refundAmount;
    await booking.save();

    // Credit refund to wallet
    if (refundAmount > 0) {
      let wallet = await Wallet.findOne({ userId: req.user.id });
      if (!wallet) wallet = new Wallet({ userId: req.user.id, balance: 0 });
      wallet.balance += refundAmount;
      wallet.transactions.push({
        type: 'credit',
        amount: refundAmount,
        description: `Refund for cancelled booking: ${booking.bikeId?.brand} ${booking.bikeId?.model}`,
      });
      await wallet.save();
    }

    // Notifications
    const io = req.app.get('io');
    const notifyMsg = refundAmount > 0
      ? `Your booking was cancelled. ₹${refundAmount.toLocaleString('en-IN')} refund added to your wallet.`
      : 'Your booking was cancelled. No refund applicable (cancelled within 24–48 hours).';

    try {
      const { notify } = require('../utils/notify');
      await notify(io, req.user.id, 'booking_cancelled', notifyMsg);
      if (booking.bikeId?.providerId) {
        await notify(io, booking.bikeId.providerId, 'booking_cancelled',
          `A booking for your ${booking.bikeId?.brand} ${booking.bikeId?.model} was cancelled.`);
      }
    } catch (_) {}

    res.json({ success: true, refundAmount, refundPercent, message: `Booking cancelled. ₹${refundAmount} refunded to wallet.` });
  })
);

module.exports = router;

const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Bike = require('../models/Bike');
const KYC = require('../models/KYC');
const Wallet = require('../models/Wallet');
const authMiddleware = require('../middleware/authMiddleware');
const { createNotification } = require('../utils/notifications');

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
router.post('/', authMiddleware(), async (req, res) => {
  try {
    const {
      bikeId, startDate, endDate, planType = 'daily', hours = 0,
      deliveryType = 'pickup', deliveryAddress, deliverySlot,
      useWallet = false,
    } = req.body;

    // KYC check
    const kyc = await KYC.findOne({ userId: req.user.id });
    if (!kyc || kyc.status !== 'verified') {
      return res.status(403).json({ success: false, message: 'KYC_REQUIRED', kycStatus: kyc?.status || 'not_started' });
    }

    // Bike availability
    const bike = await Bike.findById(bikeId);
    if (!bike || !bike.isAvailable || !bike.isApproved) {
      return res.status(400).json({ success: false, message: 'Bike is not available for booking.' });
    }

    // Cost calculation
    let totalCost = computeCost(bike.pricePerDay, planType, startDate, endDate, hours);

    // Doorstep delivery surcharge
    if (deliveryType === 'doorstep') totalCost += 50;

    // Wallet deduction
    let walletDeducted = 0;
    let wallet = null;
    if (useWallet) {
      wallet = await Wallet.findOne({ userId: req.user.id });
      if (wallet && wallet.balance > 0) {
        walletDeducted = Math.min(wallet.balance, totalCost);
        wallet.balance -= walletDeducted;
        wallet.transactions.push({
          type: 'debit',
          amount: walletDeducted,
          description: `Booking: ${bike.brand} ${bike.model}`,
        });
        await wallet.save();
      }
    }

    const booking = new Booking({
      bikeId,
      customerId: req.user.id,
      planType,
      startDate,
      endDate,
      hours: planType === 'hourly' ? (hours || 1) : 0,
      totalCost,
      deliveryType,
      deliveryAddress: deliveryType === 'doorstep' ? deliveryAddress : {},
      deliverySlot: deliveryType === 'doorstep' ? deliverySlot : '',
      useWallet,
      walletDeducted,
    });

    await booking.save();

    // Notify customer
    await createNotification(req.user.id, 'booking_confirmed',
      `Your booking for ${bike.brand} ${bike.model} is confirmed! Total: ₹${totalCost.toLocaleString('en-IN')}`);

    // Notify provider
    await createNotification(bike.providerId, 'new_booking',
      `New booking on your ${bike.brand} ${bike.model} from ${new Date(startDate).toLocaleDateString('en-IN')}`);

    res.status(201).json({ success: true, booking, walletDeducted });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ─── GET /api/bookings/my-bookings ───────────────────────────────────────────
router.get('/my-bookings', authMiddleware(), async (req, res) => {
  try {
    const bookings = await Booking.find({ customerId: req.user.id })
      .populate('bikeId')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/bookings/provider ──────────────────────────────────────────────
router.get('/provider', authMiddleware(['provider']), async (req, res) => {
  try {
    const bikes = await Bike.find({ providerId: req.user.id });
    const bikeIds = bikes.map((b) => b._id);
    const bookings = await Booking.find({ bikeId: { $in: bikeIds } })
      .populate('customerId', 'name email')
      .populate('bikeId', 'brand model city')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── PATCH /api/bookings/:id/cancel ──────────────────────────────────────────
router.patch('/:id/cancel', authMiddleware(), async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, customerId: req.user.id })
      .populate('bikeId');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status === 'cancelled') return res.status(400).json({ success: false, message: 'Already cancelled' });
    if (booking.status === 'completed') return res.status(400).json({ success: false, message: 'Cannot cancel a completed booking' });

    const now = new Date();
    const start = new Date(booking.startDate);
    const hoursUntilStart = (start - now) / 3600000;

    if (hoursUntilStart < 24) {
      return res.status(400).json({ success: false, message: 'Cancellations must be made at least 24 hours before pickup.' });
    }

    // Refund policy
    let refundPercent = 0;
    if (hoursUntilStart >= 48)      refundPercent = 100;
    else if (hoursUntilStart >= 24) refundPercent = 50;

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

      await createNotification(req.user.id, 'booking_cancelled',
        `Your booking was cancelled. ₹${refundAmount.toLocaleString('en-IN')} refund added to your wallet.`);
    } else {
      await createNotification(req.user.id, 'booking_cancelled',
        `Your booking was cancelled. No refund applicable (cancelled within 24 hours).`);
    }

    // Notify provider
    if (booking.bikeId?.providerId) {
      await createNotification(booking.bikeId.providerId, 'booking_cancelled',
        `A booking for your ${booking.bikeId?.brand} ${booking.bikeId?.model} was cancelled.`);
    }

    res.json({ success: true, refundAmount, refundPercent, message: `Booking cancelled. ₹${refundAmount} refunded to wallet.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ─── Backward-compat alias ───────────────────────────────────────────────────
router.get('/provider-bookings', authMiddleware(['provider']), async (req, res) => {
  try {
    const bikes = await Bike.find({ providerId: req.user.id });
    const bikeIds = bikes.map((b) => b._id);
    const bookings = await Booking.find({ bikeId: { $in: bikeIds } })
      .populate('customerId', 'name email')
      .populate('bikeId', 'brand model')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

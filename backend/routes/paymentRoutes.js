// RidePulse — Real Razorpay payment gateway routes: create order, verify, and webhook
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const authMiddleware = require('../middleware/authMiddleware');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

let razorpay;
try {
  razorpay = require('../config/razorpay');
} catch {
  console.warn('Razorpay config not loaded');
}

// ─── POST /api/payments/create-order ─────────────────────────────────────────
router.post('/create-order', authMiddleware(), catchAsync(async (req, res, next) => {
  if (!razorpay) return next(new AppError('Payment gateway not configured', 503));

  const { amount, bookingId, currency = 'INR' } = req.body;

  if (!amount || !Number.isInteger(Number(amount)) || Number(amount) < 100) {
    return next(new AppError('Amount must be a positive integer in paise (minimum 100 paise = ₹1)', 400));
  }
  if (!bookingId) return next(new AppError('bookingId is required', 400));

  const booking = await Booking.findById(bookingId);
  if (!booking) return next(new AppError('Booking not found', 404));
  if (booking.customerId.toString() !== req.user.id) {
    return next(new AppError('Unauthorized', 403));
  }

  const order = await razorpay.orders.create({
    amount: Number(amount),
    currency,
    receipt: bookingId.toString(),
  });

  // Persist the order
  await Payment.create({
    orderId: order.id,
    bookingId,
    userId: req.user.id,
    amount: Number(amount),
    currency,
    status: 'created',
  });

  res.json({
    success: true,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
}));

// ─── POST /api/payments/verify ────────────────────────────────────────────────
router.post('/verify', authMiddleware(), catchAsync(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return next(new AppError('razorpay_order_id, razorpay_payment_id, and razorpay_signature are required', 400));
  }

  // HMAC-SHA256 signature verification
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSig !== razorpay_signature) {
    return next(new AppError('Payment verification failed: signature mismatch', 400));
  }

  // Update payment and booking status
  const payment = await Payment.findOneAndUpdate(
    { orderId: razorpay_order_id },
    { status: 'paid', paymentId: razorpay_payment_id },
    { new: true }
  );
  if (!payment) return next(new AppError('Payment record not found', 404));

  await Booking.findByIdAndUpdate(payment.bookingId, { status: 'confirmed' });

  // Notify user
  const io = req.app.get('io');
  try {
    const { notify } = require('../utils/notify');
    await notify(io, req.user.id, 'payment_confirmed', 'Your payment was successful and booking is confirmed!');
  } catch (_) {}

  res.json({ success: true, message: 'Payment verified and booking confirmed.' });
}));

// ─── POST /api/payments/webhook ───────────────────────────────────────────────
// NOTE: This route uses express.raw — body must NOT be parsed as JSON
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET not set');
      return res.status(500).json({ success: false });
    }

    // Verify webhook signature
    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.body)
      .digest('hex');

    if (expectedSig !== signature) {
      return res.status(403).json({ success: false, message: 'Invalid webhook signature' });
    }

    let event;
    try {
      event = JSON.parse(req.body.toString());
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    const eventType = event.event;
    const paymentEntity = event.payload?.payment?.entity;

    try {
      if (eventType === 'payment.captured' || eventType === 'order.paid') {
        await Payment.findOneAndUpdate(
          { orderId: paymentEntity?.order_id },
          { status: 'paid', paymentId: paymentEntity?.id }
        );
        await Booking.findOneAndUpdate(
          { _id: (await Payment.findOne({ orderId: paymentEntity?.order_id }))?.bookingId },
          { status: 'confirmed' }
        );
      } else if (eventType === 'payment.failed') {
        const pmt = await Payment.findOneAndUpdate(
          { orderId: paymentEntity?.order_id },
          { status: 'failed' },
          { new: true }
        );
        if (pmt) {
          await Booking.findByIdAndUpdate(pmt.bookingId, { status: 'payment_failed' });
        }
      }
    } catch (err) {
      console.error('Webhook processing error:', err.message);
    }

    res.json({ success: true });
  }
);

module.exports = router;

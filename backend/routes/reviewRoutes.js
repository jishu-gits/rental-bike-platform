// RidePulse — Bike review submission and retrieval routes
const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Bike = require('../models/Bike');
const authMiddleware = require('../middleware/authMiddleware');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// ─── POST /api/reviews ────────────────────────────────────────────────────────
router.post('/', authMiddleware(), catchAsync(async (req, res, next) => {
  const { bookingId, rating, comment } = req.body;
  if (!bookingId || !rating) return next(new AppError('bookingId and rating are required', 400));
  if (rating < 1 || rating > 5) return next(new AppError('Rating must be between 1 and 5', 400));

  const booking = await Booking.findOne({ _id: bookingId, customerId: req.user.id });
  if (!booking) return next(new AppError('Booking not found', 404));
  if (booking.status !== 'completed') return next(new AppError('You can only review completed bookings', 400));

  const existing = await Review.findOne({ bookingId });
  if (existing) return next(new AppError('You have already reviewed this booking', 400));

  const bike = await Bike.findById(booking.bikeId);
  if (!bike) return next(new AppError('Bike not found', 404));

  const review = await Review.create({
    bookingId,
    reviewerId: req.user.id,
    bikeId: bike._id,
    providerId: bike.providerId,
    rating: Number(rating),
    comment: comment || '',
  });

  // Update bike's average rating
  const allReviews = await Review.find({ bikeId: bike._id });
  const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
  bike.averageRating = Math.round(avg * 10) / 10;
  bike.reviewCount = allReviews.length;
  await bike.save();

  // Notify provider
  const io = req.app.get('io');
  try {
    const { notify } = require('../utils/notify');
    await notify(io, bike.providerId, 'review_received',
      `Your ${bike.brand} ${bike.model} received a ${rating}-star review!`);
  } catch (_) {}

  res.status(201).json({ success: true, review });
}));

// ─── GET /api/reviews/bike/:bikeId ────────────────────────────────────────────
router.get('/bike/:bikeId', catchAsync(async (req, res) => {
  const reviews = await Review.find({ bikeId: req.params.bikeId })
    .populate('reviewerId', 'name')
    .sort({ createdAt: -1 });
  res.json(reviews);
}));

module.exports = router;

const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Bike = require('../models/Bike');
const authMiddleware = require('../middleware/authMiddleware');
const { createNotification } = require('../utils/notifications');

// ─── POST /api/reviews ────────────────────────────────────────────────────────
router.post('/', authMiddleware(), async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;

    const booking = await Booking.findOne({ _id: bookingId, customerId: req.user.id });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status !== 'completed') return res.status(400).json({ success: false, message: 'You can only review completed bookings.' });

    const existing = await Review.findOne({ bookingId });
    if (existing) return res.status(400).json({ success: false, message: 'You have already reviewed this booking.' });

    const bike = await Bike.findById(booking.bikeId);
    if (!bike) return res.status(404).json({ success: false, message: 'Bike not found' });

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
    await createNotification(bike.providerId, 'review_received',
      `Your ${bike.brand} ${bike.model} received a ${rating}-star review!`);

    res.status(201).json({ success: true, review });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ─── GET /api/reviews/bike/:bikeId ────────────────────────────────────────────
router.get('/bike/:bikeId', async (req, res) => {
  try {
    const reviews = await Review.find({ bikeId: req.params.bikeId })
      .populate('reviewerId', 'name')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Bike = require('../models/Bike');
const authMiddleware = require('../middleware/authMiddleware');

// Customer: Create a booking (any logged-in user can book)
router.post('/', authMiddleware(), async (req, res) => {
  try {
    const { bikeId, startDate, endDate, totalCost } = req.body;
    
    // Check if bike is available
    const bike = await Bike.findById(bikeId);
    if (!bike || !bike.isAvailable || !bike.isApproved) {
      return res.status(400).json({ message: "Bike is not available for booking." });
    }

    const booking = new Booking({
      bikeId,
      customerId: req.user.id,
      startDate,
      endDate,
      totalCost
    });

    await booking.save();
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// View own bookings (any logged-in user)
router.get('/my-bookings', authMiddleware(), async (req, res) => {
  try {
    const bookings = await Booking.find({ customerId: req.user.id }).populate('bikeId');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Provider: View bookings on their bikes
router.get('/provider-bookings', authMiddleware(['provider']), async (req, res) => {
  try {
    // Find all bikes owned by the provider
    const bikes = await Bike.find({ providerId: req.user.id });
    const bikeIds = bikes.map(b => b._id);
    
    // Find all bookings for these bikes
    const bookings = await Booking.find({ bikeId: { $in: bikeIds } }).populate('customerId', 'name email').populate('bikeId', 'brand model');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

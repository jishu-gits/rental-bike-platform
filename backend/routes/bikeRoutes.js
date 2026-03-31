const express = require('express');
const router = express.Router();
const Bike = require('../models/Bike');
const authMiddleware = require('../middleware/authMiddleware');

// Get all approved bikes (Public/Customer)
router.get('/', async (req, res) => {
  try {
    const filters = { isApproved: true, isAvailable: true };
    // Add optional filters like category, location
    if (req.query.category) filters.category = req.query.category;
    if (req.query.location) filters.location = new RegExp(req.query.location, 'i');
    
    const bikes = await Bike.find(filters).populate('providerId', 'name');
    res.json(bikes);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Provider: Add a new bike
router.post('/', authMiddleware(['provider']), async (req, res) => {
  try {
    const newBike = new Bike({ ...req.body, providerId: req.user.id });
    await newBike.save();
    res.status(201).json(newBike);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Provider: Get their own bikes
router.get('/my-bikes', authMiddleware(['provider']), async (req, res) => {
  try {
    const bikes = await Bike.find({ providerId: req.user.id });
    res.json(bikes);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Admin: Get all bikes (for approval)
router.get('/all', authMiddleware(['admin']), async (req, res) => {
  try {
    const bikes = await Bike.find();
    res.json(bikes);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

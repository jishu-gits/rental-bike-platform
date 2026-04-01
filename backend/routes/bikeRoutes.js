const express = require('express');
const router = express.Router();
const Bike = require('../models/Bike');
const authMiddleware = require('../middleware/authMiddleware');
const { upload } = require('../middleware/cloudinary');

// Get all available bikes (Public — no admin approval required for now)
router.get('/', async (req, res) => {
  try {
    const filters = { isAvailable: true };
    if (req.query.category) filters.category = req.query.category;
    if (req.query.location) filters.location = new RegExp(req.query.location, 'i');

    const bikes = await Bike.find(filters).populate('providerId', 'name').sort({ createdAt: -1 });
    res.json(bikes);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Provider: Add a new bike (with image upload)
router.post(
  '/',
  authMiddleware(['provider']),
  upload.array('images', 5), // up to 5 images
  async (req, res) => {
    try {
      const imageUrls = req.files ? req.files.map((f) => f.path) : [];
      const newBike = new Bike({
        ...req.body,
        pricePerDay: Number(req.body.pricePerDay),
        year: Number(req.body.year),
        providerId: req.user.id,
        images: imageUrls,
      });
      await newBike.save();
      res.status(201).json(newBike);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

// Provider: Get their own bikes
router.get('/my-bikes', authMiddleware(['provider']), async (req, res) => {
  try {
    const bikes = await Bike.find({ providerId: req.user.id }).sort({ createdAt: -1 });
    res.json(bikes);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Provider: Toggle bike availability
router.patch('/:id/availability', authMiddleware(['provider']), async (req, res) => {
  try {
    const bike = await Bike.findOne({ _id: req.params.id, providerId: req.user.id });
    if (!bike) return res.status(404).json({ message: 'Bike not found' });
    bike.isAvailable = !bike.isAvailable;
    await bike.save();
    res.json(bike);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get all bikes
router.get('/all', authMiddleware(['admin']), async (req, res) => {
  try {
    const bikes = await Bike.find().populate('providerId', 'name email');
    res.json(bikes);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

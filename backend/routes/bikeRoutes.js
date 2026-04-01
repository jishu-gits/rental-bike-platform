const express = require('express');
const router = express.Router();
const Bike = require('../models/Bike');
const authMiddleware = require('../middleware/authMiddleware');
const { upload } = require('../middleware/cloudinary');

// ── GET /api/bikes/cities (public) ──────────────────────────────────────────
router.get('/cities', async (req, res) => {
  try {
    const cities = await Bike.distinct('city', { isAvailable: true, city: { $ne: null, $ne: '' } });
    res.json(cities.filter(Boolean).sort());
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/bikes (public) ──────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const filters = { isAvailable: true, isApproved: true };
    if (req.query.category && req.query.category !== 'all') filters.category = req.query.category;
    if (req.query.location) filters.location = new RegExp(req.query.location, 'i');
    if (req.query.city)     filters.city = new RegExp(req.query.city, 'i');
    if (req.query.fuelType) filters.fuelType = req.query.fuelType;

    const bikes = await Bike.find(filters)
      .populate('providerId', 'name')
      .sort({ createdAt: -1 });
    res.json(bikes);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/bikes/my-bikes (provider) ──────────────────────────────────────
router.get('/my-bikes', authMiddleware(['provider']), async (req, res) => {
  try {
    const bikes = await Bike.find({ providerId: req.user.id }).sort({ createdAt: -1 });
    res.json(bikes);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/bikes/all (admin) ───────────────────────────────────────────────
router.get('/all', authMiddleware(['admin']), async (req, res) => {
  try {
    const bikes = await Bike.find().populate('providerId', 'name email');
    res.json(bikes);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/bikes/:id (public) ──────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id).populate('providerId', 'name');
    if (!bike) return res.status(404).json({ success: false, message: 'Bike not found' });
    res.json(bike);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/bikes (provider) ───────────────────────────────────────────────
router.post(
  '/',
  authMiddleware(['provider']),
  upload.array('images', 5),
  async (req, res) => {
    try {
      const imageUrls = req.files ? req.files.map((f) => f.path) : [];
      const newBike = new Bike({
        ...req.body,
        pricePerDay: Number(req.body.pricePerDay),
        year: Number(req.body.year),
        providerId: req.user.id,
        images: imageUrls,
        fuelType: req.body.fuelType || 'petrol',
        city: req.body.city || '',
        state: req.body.state || '',
      });
      await newBike.save();
      res.status(201).json(newBike);
    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
  }
);

// ── PATCH /api/bikes/:id/availability (provider) ─────────────────────────────
router.patch('/:id/availability', authMiddleware(['provider']), async (req, res) => {
  try {
    const bike = await Bike.findOne({ _id: req.params.id, providerId: req.user.id });
    if (!bike) return res.status(404).json({ success: false, message: 'Bike not found' });
    bike.isAvailable = !bike.isAvailable;
    await bike.save();
    res.json(bike);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

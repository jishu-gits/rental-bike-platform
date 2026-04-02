// RidePulse — Bike listing, creation, and management routes
const express = require('express');
const router = express.Router();
const { z } = require('zod');
const Bike = require('../models/Bike');
const authMiddleware = require('../middleware/authMiddleware');
const { upload } = require('../middleware/cloudinary');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const validate = require('../middleware/validate');
const { geocodeCity } = require('../utils/geocode');
const { addBikeSchema, updateBikeSchema } = require('../validations/bike.validation');
const { objectIdSchema } = require('../validations/common.validation');

const objectIdParamSchema = z.object({ id: objectIdSchema });

// ── GET /api/bikes/cities (public) ───────────────────────────────────────────
router.get('/cities', catchAsync(async (req, res) => {
  const cities = await Bike.distinct('city', { isAvailable: true, city: { $ne: null, $ne: '' } });
  res.json(cities.filter(Boolean).sort());
}));

// ── GET /api/bikes (public) ──────────────────────────────────────────────────
router.get('/', catchAsync(async (req, res) => {
  const filters = { isAvailable: true, isApproved: true, removed: { $ne: true } };
  if (req.query.category && req.query.category !== 'all') filters.category = req.query.category;
  if (req.query.location) filters.location = new RegExp(req.query.location, 'i');
  if (req.query.city)     filters.city = new RegExp(req.query.city, 'i');
  if (req.query.fuelType) filters.fuelType = req.query.fuelType;

  const bikes = await Bike.find(filters)
    .populate('providerId', 'name')
    .sort({ createdAt: -1 });
  res.json(bikes);
}));

// ── GET /api/bikes/my-bikes (provider) ──────────────────────────────────────
router.get('/my-bikes', authMiddleware(['provider']), catchAsync(async (req, res) => {
  const bikes = await Bike.find({ providerId: req.user.id }).sort({ createdAt: -1 });
  res.json(bikes);
}));

// ── GET /api/bikes/all (admin) ───────────────────────────────────────────────
router.get('/all', authMiddleware(['admin']), catchAsync(async (req, res) => {
  const bikes = await Bike.find().populate('providerId', 'name email');
  res.json(bikes);
}));

// ── GET /api/bikes/:id (public) ──────────────────────────────────────────────
router.get('/:id', validate(objectIdParamSchema, 'params'), catchAsync(async (req, res, next) => {
  const bike = await Bike.findById(req.params.id).populate('providerId', 'name');
  if (!bike) return next(new AppError('Bike not found', 404));
  res.json(bike);
}));

// ── POST /api/bikes (provider) ───────────────────────────────────────────────
router.post(
  '/',
  authMiddleware(['provider']),
  upload.array('images', 5),
  validate(addBikeSchema),
  catchAsync(async (req, res) => {
    const imageUrls = req.files ? req.files.map((f) => f.path) : [];

    // Geocode the city
    let coordinates = {};
    if (req.body.city) {
      try {
        coordinates = await geocodeCity(req.body.city);
      } catch (_) {
        // Non-fatal if geocoding fails
      }
    }

    const newBike = new Bike({
      ...req.body,
      pricePerDay: Number(req.body.pricePerDay),
      year: Number(req.body.year),
      providerId: req.user.id,
      images: imageUrls,
      fuelType: req.body.fuelType || 'petrol',
      city: req.body.city || '',
      state: req.body.state || '',
      coordinates,
    });
    await newBike.save();
    res.status(201).json(newBike);
  })
);

// ── PATCH /api/bikes/:id/availability (provider) ─────────────────────────────
router.patch(
  '/:id/availability',
  authMiddleware(['provider']),
  validate(objectIdParamSchema, 'params'),
  catchAsync(async (req, res, next) => {
    const bike = await Bike.findOne({ _id: req.params.id, providerId: req.user.id });
    if (!bike) return next(new AppError('Bike not found or you are not the owner', 404));
    bike.isAvailable = !bike.isAvailable;
    await bike.save();
    res.json(bike);
  })
);

// ── PATCH /api/bikes/:id (provider) — update bike details ────────────────────
router.patch(
  '/:id',
  authMiddleware(['provider']),
  validate(objectIdParamSchema, 'params'),
  validate(updateBikeSchema),
  catchAsync(async (req, res, next) => {
    const bike = await Bike.findById(req.params.id);
    if (!bike) return next(new AppError('Bike not found', 404));
    if (bike.providerId.toString() !== req.user.id) {
      return next(new AppError('You are not authorized to edit this bike', 403));
    }

    // Re-geocode if city is being updated
    if (req.body.city && req.body.city !== bike.city) {
      try {
        req.body.coordinates = await geocodeCity(req.body.city);
      } catch (_) {}
    }

    Object.assign(bike, req.body);
    await bike.save();
    res.json(bike);
  })
);

// ── DELETE /api/bikes/:id (provider) ─────────────────────────────────────────
router.delete(
  '/:id',
  authMiddleware(['provider']),
  validate(objectIdParamSchema, 'params'),
  catchAsync(async (req, res, next) => {
    const bike = await Bike.findById(req.params.id);
    if (!bike) return next(new AppError('Bike not found', 404));
    if (bike.providerId.toString() !== req.user.id) {
      return next(new AppError('Not authorized to delete this bike', 403));
    }
    await bike.deleteOne();
    res.json({ success: true, message: 'Bike deleted successfully' });
  })
);

module.exports = router;

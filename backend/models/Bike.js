const mongoose = require('mongoose');

const bikeSchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  brand: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: Number, required: true },
  category: { type: String, enum: ['sports', 'cruiser', 'scooter', 'standard', 'electric'], required: true },
  fuelType: { type: String, enum: ['petrol', 'electric', 'hybrid'], default: 'petrol' },
  pricePerDay: { type: Number, required: true },
  location: { type: String, required: true },
  city: { type: String, index: true },
  state: { type: String },
  coordinates: { lat: { type: Number }, lng: { type: Number } },
  images: [{ type: String }],
  isApproved: { type: Boolean, default: true },
  isAvailable: { type: Boolean, default: true },
  averageRating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Bike', bikeSchema);

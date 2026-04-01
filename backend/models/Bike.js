const mongoose = require('mongoose');

const bikeSchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  brand: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: Number, required: true },
  category: { type: String, enum: ['sports', 'cruiser', 'scooter', 'standard'], required: true },
  pricePerDay: { type: Number, required: true },
  location: { type: String, required: true },
  images: [{ type: String }], // Array of image URLs
  isApproved: { type: Boolean, default: true }, // Set to false when admin approval flow is added
  isAvailable: { type: Boolean, default: true } // Can be toggled by the provider
}, { timestamps: true });

module.exports = mongoose.model('Bike', bikeSchema);

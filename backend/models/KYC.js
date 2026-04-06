// RidePulse — KYC model tracking real government verification status per step
const mongoose = require('mongoose');

const KYCSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // Step 1 — Driving License
  dl: {
    number: String,
    dob: String,
    verified: { type: Boolean, default: false },
    name: String,
    validity: String,
    vehicleClasses: [String],
    issueDate: String,
    state: String,
    rawResponse: mongoose.Schema.Types.Mixed,
  },

  // Step 2 — PAN
  pan: {
    number: String,
    verified: { type: Boolean, default: false },
    name: String,
    type: String,
    rawResponse: mongoose.Schema.Types.Mixed,
  },

  // Step 3 — Name cross-match
  nameMatch: {
    score: Number,
    passed: { type: Boolean, default: false },
    dlName: String,
    panName: String,
  },

  // Step 4 — Face match
  face: {
    selfieUrl: String,
    matched: { type: Boolean, default: false },
    confidence: Number,
  },

  // Overall
  status: {
    type: String,
    enum: ['not_started', 'dl_verified', 'pan_verified', 'face_verified', 'verified', 'rejected'],
    default: 'not_started',
  },
  rejectionReason: String,
  verifiedAt: Date,

}, { timestamps: true });

module.exports = mongoose.models.KYC || mongoose.model('KYC', KYCSchema);

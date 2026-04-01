const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  drivingLicenseFrontUrl: { type: String },
  drivingLicenseBackUrl: { type: String },
  govtIdUrl: { type: String },
  status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('KYC', kycSchema);

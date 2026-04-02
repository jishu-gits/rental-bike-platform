// RidePulse — KYC document submission and status check routes
const express = require('express');
const router = express.Router();
const KYC = require('../models/KYC');
const authMiddleware = require('../middleware/authMiddleware');
const { upload } = require('../middleware/cloudinary');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// ─── POST /api/kyc/submit ─────────────────────────────────────────────────────
router.post(
  '/submit',
  authMiddleware(),
  upload.fields([
    { name: 'drivingLicenseFront', maxCount: 1 },
    { name: 'drivingLicenseBack',  maxCount: 1 },
    { name: 'govtId',              maxCount: 1 },
  ]),
  catchAsync(async (req, res, next) => {
    const files = req.files || {};
    const dlFront = files.drivingLicenseFront?.[0]?.path;
    const dlBack  = files.drivingLicenseBack?.[0]?.path;
    const govtId  = files.govtId?.[0]?.path;

    if (!dlFront || !govtId) {
      return next(new AppError('Driving license (front) and government-issued ID are required', 400));
    }

    const kyc = await KYC.findOneAndUpdate(
      { userId: req.user.id },
      {
        drivingLicenseFrontUrl: dlFront,
        drivingLicenseBackUrl:  dlBack || '',
        govtIdUrl:              govtId,
        status:                 'pending',
        submittedAt:            new Date(),
        reviewedAt:             null,
      },
      { upsert: true, new: true }
    );

    // Auto-approve after 1 minute (dev simulation — replaced by admin panel in production)
    setTimeout(async () => {
      try {
        const record = await KYC.findOne({ userId: req.user.id });
        if (record && record.status === 'pending') {
          record.status = 'verified';
          record.reviewedAt = new Date();
          await record.save();
        }
      } catch (e) {
        console.error('KYC auto-approve error:', e.message);
      }
    }, 60 * 1000);

    res.json({ success: true, kyc });
  })
);

// ─── GET /api/kyc/status ─────────────────────────────────────────────────────
router.get('/status', authMiddleware(), catchAsync(async (req, res) => {
  const kyc = await KYC.findOne({ userId: req.user.id });
  if (!kyc) return res.json({ success: true, status: 'not_started', kyc: null });
  res.json({ success: true, status: kyc.status, kyc });
}));

module.exports = router;

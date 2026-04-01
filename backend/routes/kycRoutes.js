const express = require('express');
const router = express.Router();
const KYC = require('../models/KYC');
const authMiddleware = require('../middleware/authMiddleware');
const { upload } = require('../middleware/cloudinary');
const { createNotification } = require('../utils/notifications');

// ─── POST /api/kyc/submit ─────────────────────────────────────────────────────
router.post(
  '/submit',
  authMiddleware(),
  upload.fields([
    { name: 'drivingLicenseFront', maxCount: 1 },
    { name: 'drivingLicenseBack',  maxCount: 1 },
    { name: 'govtId',              maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const files = req.files || {};
      const dlFront = files.drivingLicenseFront?.[0]?.path;
      const dlBack  = files.drivingLicenseBack?.[0]?.path;
      const govtId  = files.govtId?.[0]?.path;

      if (!dlFront || !govtId) {
        return res.status(400).json({ success: false, message: 'Driving license (front) and govt ID are required.' });
      }

      // Upsert KYC record
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

      // Auto-approve after 5 minutes (simulated review)
      setTimeout(async () => {
        try {
          const record = await KYC.findOne({ userId: req.user.id });
          if (record && record.status === 'pending') {
            record.status = 'verified';
            record.reviewedAt = new Date();
            await record.save();
            await createNotification(req.user.id, 'kyc_approved',
              '🎉 Your KYC verification is approved! You can now book bikes.');
          }
        } catch (e) { console.error('KYC auto-approve error:', e.message); }
      }, 1 * 60 * 1000); // 5 minutes

      res.json({ success: true, kyc });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
  }
);

// ─── GET /api/kyc/status ─────────────────────────────────────────────────────
router.get('/status', authMiddleware(), async (req, res) => {
  try {
    const kyc = await KYC.findOne({ userId: req.user.id });
    if (!kyc) return res.json({ success: true, status: 'not_started', kyc: null });
    res.json({ success: true, status: kyc.status, kyc });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

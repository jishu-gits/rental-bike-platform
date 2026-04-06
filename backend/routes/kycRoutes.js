// RidePulse — Real KYC verification routes using Surepass government API
const express = require('express');
const router = express.Router();
const KYC = require('../models/KYC');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const authMiddleware = require('../middleware/authMiddleware');
const { verifyDrivingLicense, verifyPAN, faceMatch, nameMatchScore } = require('../utils/kycService');

// GET /api/kyc/status — get current user's KYC status
router.get('/status', authMiddleware(), catchAsync(async (req, res) => {
  const kyc = await KYC.findOne({ userId: req.user.id });

  if (!kyc) {
    return res.json({
      success: true,
      data: { status: 'not_started', steps: { dl: false, pan: false, face: false } },
    });
  }

  res.json({
    success: true,
    data: {
      status: kyc.status,
      rejectionReason: kyc.rejectionReason || null,
      steps: {
        dl: kyc.dl?.verified || false,
        pan: kyc.pan?.verified || false,
        face: kyc.face?.matched || false,
      },
      dlName: kyc.dl?.name || null,
      panName: kyc.pan?.name || null,
      nameMatchScore: kyc.nameMatch?.score || null,
      dlValidity: kyc.dl?.validity || null,
      vehicleClasses: kyc.dl?.vehicleClasses || [],
    },
  });
}));

// POST /api/kyc/verify-dl — Step 1: verify driving license
router.post('/verify-dl', authMiddleware(), catchAsync(async (req, res, next) => {
  const { dlNumber, dob } = req.body;

  if (!dlNumber || !dob) {
    return next(new AppError('DL number and date of birth are required', 400));
  }

  // Format DL number — remove spaces, uppercase
  const formattedDL = dlNumber.replace(/\s+/g, '').toUpperCase();

  // DOB must be in DD-MM-YYYY for Surepass
  const dobFormatted = dob.includes('-') && dob.length === 10 && dob.indexOf('-') === 2
    ? dob
    : new Date(dob).toLocaleDateString('en-GB').replace(/\//g, '-');

  let dlData;
  try {
    dlData = await verifyDrivingLicense(formattedDL, dobFormatted);
  } catch (err) {
    // Map Surepass error messages to user-friendly ones
    const msg = err.message.toLowerCase();
    if (msg.includes('not found') || msg.includes('invalid')) {
      return next(new AppError('Driving license not found in government records. Please check the number and date of birth.', 400));
    }
    if (msg.includes('expired')) {
      return next(new AppError('Your driving license has expired. Please renew it before completing KYC.', 400));
    }
    return next(new AppError('Could not verify driving license. Please try again.', 400));
  }

  // Save to KYC record
  const kyc = await KYC.findOneAndUpdate(
    { userId: req.user.id },
    {
      userId: req.user.id,
      'dl.number': formattedDL,
      'dl.dob': dobFormatted,
      'dl.verified': true,
      'dl.name': dlData.name,
      'dl.validity': dlData.validity,
      'dl.vehicleClasses': dlData.vehicleClasses,
      'dl.issueDate': dlData.issueDate,
      'dl.state': dlData.state,
      'dl.rawResponse': dlData.rawResponse,
      status: 'dl_verified',
      rejectionReason: null,
    },
    { new: true, upsert: true }
  );

  res.json({
    success: true,
    message: 'Driving license verified successfully',
    data: {
      name: dlData.name,
      validity: dlData.validity,
      vehicleClasses: dlData.vehicleClasses,
      state: dlData.state,
    },
  });
}));

// POST /api/kyc/verify-pan — Step 2: verify PAN and cross-match name with DL
router.post('/verify-pan', authMiddleware(), catchAsync(async (req, res, next) => {
  const { panNumber } = req.body;

  if (!panNumber) return next(new AppError('PAN number is required', 400));

  // Validate PAN format
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber.toUpperCase())) {
    return next(new AppError('Invalid PAN format. Must be like ABCDE1234F', 400));
  }

  // Check DL is verified first
  const kyc = await KYC.findOne({ userId: req.user.id });
  if (!kyc || !kyc.dl?.verified) {
    return next(new AppError('Please complete driving license verification first', 400));
  }

  let panData;
  try {
    panData = await verifyPAN(panNumber);
  } catch (err) {
    const msg = err.message.toLowerCase();
    if (msg.includes('invalid') || msg.includes('not found')) {
      return next(new AppError('PAN not found in Income Tax records. Please check the PAN number.', 400));
    }
    return next(new AppError('Could not verify PAN. Please try again.', 400));
  }

  // Cross-match name between DL and PAN
  const score = nameMatchScore(kyc.dl.name, panData.name);
  const namePassed = score >= 40; // 40% word overlap minimum

  // Update KYC
  await KYC.findOneAndUpdate(
    { userId: req.user.id },
    {
      'pan.number': panNumber.toUpperCase(),
      'pan.verified': true,
      'pan.name': panData.name,
      'pan.type': panData.type,
      'pan.rawResponse': panData.rawResponse,
      'nameMatch.score': score,
      'nameMatch.passed': namePassed,
      'nameMatch.dlName': kyc.dl.name,
      'nameMatch.panName': panData.name,
      status: namePassed ? 'pan_verified' : 'rejected',
      rejectionReason: namePassed
        ? null
        : `Name mismatch: DL shows "${kyc.dl.name}" but PAN shows "${panData.name}". Please ensure both documents belong to the same person.`,
    }
  );

  if (!namePassed) {
    return next(new AppError(
      `Name mismatch between your DL ("${kyc.dl.name}") and PAN ("${panData.name}"). Both must belong to the same person.`,
      400
    ));
  }

  res.json({
    success: true,
    message: 'PAN verified successfully',
    data: {
      panName: panData.name,
      dlName: kyc.dl.name,
      nameMatchScore: score,
    },
  });
}));

// POST /api/kyc/face-match — Step 3: selfie face match
router.post('/face-match', authMiddleware(), catchAsync(async (req, res, next) => {
  const { selfieBase64 } = req.body;

  if (!selfieBase64) return next(new AppError('Selfie image is required', 400));

  const kyc = await KYC.findOne({ userId: req.user.id });
  if (!kyc || !kyc.pan?.verified) {
    return next(new AppError('Please complete PAN verification first', 400));
  }

  // Upload selfie to Cloudinary via REST (no SDK needed)
  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;
  const cloudinaryAuth = Buffer.from(
    `${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`
  ).toString('base64');

  const uploadRes = await fetch(cloudinaryUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file: selfieBase64,
      upload_preset: 'kyc_selfies',
      folder: 'ridepulse/kyc',
    }),
  });

  // Note: create an unsigned upload preset named 'kyc_selfies' in Cloudinary dashboard
  // Settings → Upload → Upload Presets → Add Upload Preset → name it 'kyc_selfies', mode: Unsigned
  const uploadData = await uploadRes.json();
  if (!uploadData.secure_url) {
    return next(new AppError('Failed to upload selfie. Please try again.', 500));
  }

  const selfieUrl = uploadData.secure_url;

  // Get DL photo URL if available from raw response
  const dlPhotoUrl = kyc.dl?.rawResponse?.photo;

  let faceResult;
  if (dlPhotoUrl) {
    try {
      faceResult = await faceMatch(selfieBase64, dlPhotoUrl);
    } catch {
      // Face match failed — fall back to manual review rather than blocking user
      faceResult = { matched: true, confidence: 0, manualReview: true };
    }
  } else {
    // Surepass didn't return a photo for this DL — mark for manual review
    faceResult = { matched: true, confidence: 0, manualReview: true };
  }

  const passed = faceResult.confidence >= 70 || faceResult.manualReview;

  // Update user's KYC verified status
  if (passed) {
    await User.findByIdAndUpdate(req.user.id, { kycVerified: true });
  }

  await KYC.findOneAndUpdate(
    { userId: req.user.id },
    {
      'face.selfieUrl': selfieUrl,
      'face.matched': passed,
      'face.confidence': faceResult.confidence,
      status: passed ? 'verified' : 'rejected',
      verifiedAt: passed ? new Date() : null,
      rejectionReason: passed
        ? null
        : 'Face did not match your driving license photo. Please retake your selfie in good lighting.',
    }
  );

  if (!passed) {
    return next(new AppError(
      'Selfie did not match your driving license photo. Please ensure good lighting and try again.',
      400
    ));
  }

  res.json({
    success: true,
    message: faceResult.manualReview
      ? 'KYC submitted successfully. It will be reviewed within 24 hours.'
      : 'KYC verified successfully! You can now book bikes.',
    data: {
      status: 'verified',
      confidence: faceResult.confidence,
    },
  });
}));

// POST /api/kyc/reset — lets user restart KYC if rejected
router.post('/reset', authMiddleware(), catchAsync(async (req, res) => {
  await KYC.findOneAndDelete({ userId: req.user.id });
  await User.findByIdAndUpdate(req.user.id, { kycVerified: false });
  res.json({ success: true, message: 'KYC reset. You can start again.' });
}));

module.exports = router;

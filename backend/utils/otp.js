// RidePulse — OTP generation, hashing, Twilio SMS delivery, and MongoDB-backed verification
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// ─── OTP Mongoose model ──────────────────────────────────────────────────────
const otpSchema = new mongoose.Schema({
  phone:     { type: String, required: true, index: true },
  otp:       { type: String, required: true }, // bcrypt-hashed OTP
  expiresAt: { type: Date, required: true },
  verified:  { type: Boolean, default: false },
}, { timestamps: true });

// TTL index: MongoDB automatically removes expired docs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTP = mongoose.model('OTP', otpSchema);

// ─── Twilio client (lazy init) ───────────────────────────────────────────────
let twilioClient = null;
function getTwilio() {
  if (twilioClient) return twilioClient;
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;
  const twilio = require('twilio');
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return twilioClient;
}

/** Returns a random 6-digit OTP string. */
function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Sends OTP via Twilio SMS. Logs to console if Twilio is not configured.
 * IMPORTANT: Never log the OTP value itself in production.
 */
async function sendOTP(phone, otp) {
  const client = getTwilio();
  if (!client) {
    console.warn(`[OTP] Twilio not configured — OTP for ${phone} not sent via SMS.`);
    return;
  }
  // Ensure phone is in E.164 format for India (+91)
  const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
  await client.messages.create({
    body: `Your RidePulse verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: formattedPhone,
  });
}

/**
 * Hashes and saves the OTP to MongoDB, replacing any existing OTP for that phone.
 */
async function saveOTP(phone, plainOTP) {
  const hashed = await bcrypt.hash(plainOTP, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await OTP.findOneAndUpdate(
    { phone },
    { otp: hashed, expiresAt, verified: false },
    { upsert: true, new: true }
  );
}

/**
 * Verifies a plain OTP against the stored bcrypt hash.
 * Returns { success: true } or { success: false, message: string }.
 */
async function verifyOTP(phone, plainOTP) {
  const record = await OTP.findOne({ phone, verified: false });
  if (!record) return { success: false, message: 'No pending OTP found for this number. Please request a new one.' };
  if (record.expiresAt < new Date()) return { success: false, message: 'OTP has expired. Please request a new one.' };

  const isMatch = await bcrypt.compare(plainOTP, record.otp);
  if (!isMatch) return { success: false, message: 'Incorrect OTP. Please try again.' };

  record.verified = true;
  await record.save();
  return { success: true };
}

module.exports = { generateOTP, sendOTP, saveOTP, verifyOTP, OTP };

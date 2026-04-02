// RidePulse — Razorpay instance initialized from environment variables
const Razorpay = require('razorpay');

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('WARNING: Razorpay credentials not set. Payment routes will not function.');
}

module.exports = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

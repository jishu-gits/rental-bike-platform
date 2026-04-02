// RidePulse — Payment record model for Razorpay orders and verification status
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderId:   { type: String, required: true, unique: true }, // Razorpay order ID
  paymentId: { type: String, default: null },                // Razorpay payment ID (after capture)
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount:    { type: Number, required: true },               // Amount in paise
  currency:  { type: String, default: 'INR' },
  status:    { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);

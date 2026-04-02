// RidePulse — In-app chat message model between renter and provider for a booking
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  bookingId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  senderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:    { type: String, required: true, maxlength: 1000 },
  readAt:     { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);

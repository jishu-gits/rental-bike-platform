const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bikeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bike', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planType: { type: String, enum: ['hourly', 'daily', 'weekly', 'monthly'], default: 'daily' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  hours: { type: Number, default: 0 },          // used for hourly plan
  totalCost: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed', 'payment_failed', 'pending_return'], default: 'confirmed' },
  returned: { type: Boolean, default: false },
  cancelledAt: { type: Date },
  refundAmount: { type: Number, default: 0 },
  // Delivery
  deliveryType: { type: String, enum: ['pickup', 'doorstep'], default: 'pickup' },
  deliveryAddress: {
    street: { type: String },
    city: { type: String },
    pincode: { type: String },
  },
  deliverySlot: { type: String }, // e.g. 'morning' | 'afternoon' | 'evening'
  // Wallet
  useWallet: { type: Boolean, default: false },
  walletDeducted: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);

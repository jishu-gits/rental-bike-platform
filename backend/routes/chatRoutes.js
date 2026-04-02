// RidePulse — In-app chat routes for real-time messaging between renter and provider
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Booking = require('../models/Booking');
const Bike = require('../models/Bike');
const authMiddleware = require('../middleware/authMiddleware');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// Helper: verify that the requesting user is part of a booking (renter or provider)
async function assertBookingParticipant(bookingId, userId) {
  const booking = await Booking.findById(bookingId).populate('bikeId', 'providerId');
  if (!booking) throw new AppError('Booking not found', 404);

  const customerId = booking.customerId.toString();
  const providerId = booking.bikeId?.providerId?.toString();

  if (userId !== customerId && userId !== providerId) {
    throw new AppError('You are not a participant in this booking', 403);
  }
  return { booking, customerId, providerId };
}

// ─── GET /api/chat/:bookingId — message history ───────────────────────────────
router.get('/:bookingId', authMiddleware(), catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;
  await assertBookingParticipant(bookingId, req.user.id);

  const messages = await Message.find({ bookingId })
    .populate('senderId', 'name')
    .sort({ createdAt: 1 });

  res.json({ success: true, messages });
}));

// ─── POST /api/chat/:bookingId — send a message ───────────────────────────────
router.post('/:bookingId', authMiddleware(), catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return next(new AppError('Message content is required', 400));
  }
  if (content.length > 1000) {
    return next(new AppError('Message must not exceed 1000 characters', 400));
  }

  const { customerId, providerId } = await assertBookingParticipant(bookingId, req.user.id);

  const receiverId = req.user.id === customerId ? providerId : customerId;
  if (!receiverId) return next(new AppError('Cannot determine message recipient', 400));

  const savedMsg = await Message.create({
    bookingId,
    senderId: req.user.id,
    receiverId,
    content: content.trim(),
  });

  const populated = await savedMsg.populate('senderId', 'name');

  // Emit real-time message event to the receiver's Socket.io room
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${receiverId}`).emit('message', populated);
  }

  res.status(201).json({ success: true, message: populated });
}));

// ─── PATCH /api/chat/:bookingId/read — mark messages as read ─────────────────
router.patch('/:bookingId/read', authMiddleware(), catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;
  await assertBookingParticipant(bookingId, req.user.id);

  await Message.updateMany(
    { bookingId, receiverId: req.user.id, readAt: null },
    { $set: { readAt: new Date() } }
  );

  res.json({ success: true, message: 'Messages marked as read' });
}));

module.exports = router;

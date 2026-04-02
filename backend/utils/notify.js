// RidePulse — Unified notification helper: saves to MongoDB AND emits real-time Socket.io event
const Notification = require('../models/Notification');

/**
 * Creates a notification document and emits it to the user's Socket.io room.
 * @param {import('socket.io').Server} io - Socket.io server instance
 * @param {string} userId - Recipient's MongoDB ObjectId (string or ObjectId)
 * @param {string} type - Notification type key
 * @param {string} message - Human-readable notification message
 */
async function notify(io, userId, type, message) {
  const notification = await Notification.create({ userId, type, message });
  if (io) {
    io.to(`user:${userId.toString()}`).emit('notification', {
      id: notification._id,
      type,
      message,
      createdAt: notification.createdAt,
    });
  }
  return notification;
}

module.exports = { notify };

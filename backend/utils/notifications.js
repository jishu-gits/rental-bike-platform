const Notification = require('../models/Notification');

/**
 * Creates and saves a notification for a user.
 * @param {string} userId - The recipient's MongoDB ObjectId
 * @param {string} type - Notification type key (e.g. 'booking_confirmed')
 * @param {string} message - Human-readable message
 */
async function createNotification(userId, type, message) {
  try {
    await Notification.create({ userId, type, message });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}

module.exports = { createNotification };

// RidePulse — In-app notification retrieval and mark-as-read routes
const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/authMiddleware');
const catchAsync = require('../utils/catchAsync');

// ─── GET /api/notifications ───────────────────────────────────────────────────
router.get('/', authMiddleware(), catchAsync(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(50);
  const unreadCount = await Notification.countDocuments({ userId: req.user.id, read: false });
  res.json({ success: true, notifications, unreadCount });
}));

// ─── PATCH /api/notifications/read ───────────────────────────────────────────
router.patch('/read', authMiddleware(), catchAsync(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user.id, read: false },
    { $set: { read: true } }
  );
  res.json({ success: true, message: 'All notifications marked as read' });
}));

module.exports = router;

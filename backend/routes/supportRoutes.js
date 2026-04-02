// RidePulse — Customer support ticket creation and retrieval routes
const express = require('express');
const router = express.Router();
const SupportTicket = require('../models/SupportTicket');
const authMiddleware = require('../middleware/authMiddleware');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// ─── POST /api/support/ticket ─────────────────────────────────────────────────
router.post('/ticket', authMiddleware(), catchAsync(async (req, res, next) => {
  const { subject, message } = req.body;
  if (!subject || !message) {
    return next(new AppError('Subject and message are required', 400));
  }
  if (subject.length > 200) return next(new AppError('Subject must not exceed 200 characters', 400));
  if (message.length > 2000) return next(new AppError('Message must not exceed 2000 characters', 400));

  const ticket = await SupportTicket.create({ userId: req.user.id, subject, message });
  res.status(201).json({ success: true, ticket });
}));

// ─── GET /api/support/tickets ─────────────────────────────────────────────────
router.get('/tickets', authMiddleware(), catchAsync(async (req, res) => {
  const tickets = await SupportTicket.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json({ success: true, tickets });
}));

module.exports = router;

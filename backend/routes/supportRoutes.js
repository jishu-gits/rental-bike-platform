const express = require('express');
const router = express.Router();
const SupportTicket = require('../models/SupportTicket');
const authMiddleware = require('../middleware/authMiddleware');

// ─── POST /api/support/ticket ─────────────────────────────────────────────────
router.post('/ticket', authMiddleware(), async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ success: false, message: 'Subject and message are required.' });

    const ticket = await SupportTicket.create({ userId: req.user.id, subject, message });
    res.status(201).json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/support/tickets ─────────────────────────────────────────────────
router.get('/tickets', authMiddleware(), async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Wallet = require('../models/Wallet');
const authMiddleware = require('../middleware/authMiddleware');

// In-memory store for simulated UPI transactions (replace with DB in production)
const pendingTransactions = new Map();

// ─── POST /api/payment/upi/init ───────────────────────────────────────────────
// Creates a simulated UPI transaction intent
router.post('/upi/init', authMiddleware(), async (req, res) => {
  try {
    const { amount, purpose = 'wallet_topup' } = req.body;
    if (!amount || amount < 1) return res.status(400).json({ success: false, message: 'Invalid amount' });

    const txnId = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const upiId = 'ridepulse@upi'; // Simulated UPI ID
    const upiDeeplink = `upi://pay?pa=${upiId}&pn=RidePulse&am=${amount}&cu=INR&tn=${purpose}&tr=${txnId}`;

    pendingTransactions.set(txnId, { userId: req.user.id, amount: Number(amount), purpose, created: Date.now() });

    res.json({
      success: true,
      txnId,
      upiId,
      upiDeeplink,
      amount,
      // QR code URL using a public QR generator
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiDeeplink)}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/payment/upi/verify ─────────────────────────────────────────────
// Simulates payment verification — in production this would verify with gateway
router.post('/upi/verify', authMiddleware(), async (req, res) => {
  try {
    const { txnId } = req.body;
    const txn = pendingTransactions.get(txnId);

    if (!txn) return res.status(404).json({ success: false, message: 'Transaction not found or expired' });
    if (txn.userId !== req.user.id) return res.status(403).json({ success: false, message: 'Unauthorized' });

    // Simulate: mark payment as successful and credit wallet
    let wallet = await Wallet.findOne({ userId: req.user.id });
    if (!wallet) wallet = new Wallet({ userId: req.user.id, balance: 0 });

    wallet.balance += txn.amount;
    wallet.transactions.push({
      type: 'credit',
      amount: txn.amount,
      description: `UPI top-up · Txn: ${txnId}`,
    });
    await wallet.save();

    pendingTransactions.delete(txnId);

    res.json({ success: true, message: `₹${txn.amount} added via UPI`, balance: wallet.balance, txnId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

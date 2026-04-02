// RidePulse — Zod schemas for payment endpoints (create order, verify)
const { z } = require('zod');
const { objectIdSchema } = require('./common.validation');

const createOrderSchema = z.object({
  amount: z.preprocess((val) => (typeof val === 'string' ? Number(val) : val),
    z.number().int().min(100, 'Amount must be an integer in paise (minimum 100)')
  ),
  bookingId: objectIdSchema,
  currency: z.string().optional().default('INR'),
});

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, 'razorpay_order_id is required'),
  razorpay_payment_id: z.string().min(1, 'razorpay_payment_id is required'),
  razorpay_signature: z.string().min(1, 'razorpay_signature is required'),
});

module.exports = { createOrderSchema, verifyPaymentSchema };

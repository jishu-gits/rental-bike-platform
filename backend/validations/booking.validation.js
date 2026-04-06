// RidePulse — Booking validation schema
const { z } = require('zod');

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid booking ID');

const createBookingSchema = z.object({
  bikeId: objectIdSchema,
  planType: z.enum(['hourly', 'daily', 'weekly', 'monthly']).default('daily'),
  deliveryType: z.enum(['pickup', 'doorstep']).default('pickup'),
  useWallet: z.boolean().default(false),

  // Hourly fields — optional
  date: z.string().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format').optional(),
  durationHours: z.number().int().min(1).max(24).optional(),

  // Daily/weekly/monthly fields — optional
  startDate: z.string().optional(),
  endDate: z.string().optional(),

}).superRefine((data, ctx) => {

  if (data.planType === 'hourly') {
    if (!data.date) {
      ctx.addIssue({ path: ['date'], code: z.ZodIssueCode.custom, message: 'Date is required for hourly bookings' });
    } else {
      const selected = new Date(data.date);
      selected.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        ctx.addIssue({ path: ['date'], code: z.ZodIssueCode.custom, message: 'Date cannot be in the past' });
      }
    }
    if (!data.startTime) {
      ctx.addIssue({ path: ['startTime'], code: z.ZodIssueCode.custom, message: 'Start time is required for hourly bookings' });
    }
    if (!data.durationHours) {
      ctx.addIssue({ path: ['durationHours'], code: z.ZodIssueCode.custom, message: 'Duration is required for hourly bookings' });
    }

  } else {
    if (!data.startDate) {
      ctx.addIssue({ path: ['startDate'], code: z.ZodIssueCode.custom, message: 'Start date is required' });
    } else {
      const selected = new Date(data.startDate);
      selected.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        ctx.addIssue({ path: ['startDate'], code: z.ZodIssueCode.custom, message: 'Start date cannot be in the past' });
      }
    }
    if (!data.endDate) {
      ctx.addIssue({ path: ['endDate'], code: z.ZodIssueCode.custom, message: 'End date is required' });
    }
    if (data.startDate && data.endDate) {
      if (new Date(data.endDate) <= new Date(data.startDate)) {
        ctx.addIssue({ path: ['endDate'], code: z.ZodIssueCode.custom, message: 'End date must be after start date' });
      }
    }
  }
});

const cancelBookingSchema = z.object({
  id: objectIdSchema,
});

module.exports = { createBookingSchema, cancelBookingSchema };

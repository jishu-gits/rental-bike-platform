// RidePulse — Zod schemas for booking creation and cancellation
const { z } = require('zod');

const objectIdRegex = /^[a-f\d]{24}$/i;

const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid ObjectId');

const createBookingSchema = z.discriminatedUnion('planType', [

  // Hourly — only needs date, startTime, durationHours
  z.object({
    planType: z.literal('hourly'),
    bikeId: objectIdSchema,
    date: z.string().refine((val) => {
      const selected = new Date(val);
      selected.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selected >= today;
    }, { message: 'Date cannot be in the past' }),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
    durationHours: z.number().int().min(1).max(24),
    deliveryType: z.enum(['pickup', 'doorstep']).default('pickup'),
    deliveryAddress: z
      .object({ street: z.string().optional(), city: z.string().optional(), pincode: z.string().optional() })
      .optional(),
    deliverySlot: z.string().optional(),
    useWallet: z.boolean().default(false),
  }),

  // Daily / Weekly / Monthly — needs startDate and endDate
  z.object({
    planType: z.enum(['daily', 'weekly', 'monthly']),
    bikeId: objectIdSchema,
    startDate: z.string().refine((val) => {
      const selected = new Date(val);
      selected.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selected >= today;
    }, { message: 'Start date cannot be in the past' }),
    endDate: z.string(),
    deliveryType: z.enum(['pickup', 'doorstep']).default('pickup'),
    deliveryAddress: z
      .object({ street: z.string().optional(), city: z.string().optional(), pincode: z.string().optional() })
      .optional(),
    deliverySlot: z.string().optional(),
    useWallet: z.boolean().default(false),
  }).superRefine((data, ctx) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end <= start) {
      ctx.addIssue({
        path: ['endDate'],
        code: z.ZodIssueCode.custom,
        message: 'End date must be after start date',
      });
    }
    if (data.deliveryType === 'doorstep' && !data.deliveryAddress?.city) {
      ctx.addIssue({
        path: ['deliveryAddress', 'city'],
        code: z.ZodIssueCode.custom,
        message: 'Delivery city is required for doorstep delivery',
      });
    }
  }),

]);

const cancelBookingSchema = z.object({ id: objectIdSchema });

const objectIdParamSchema = z.object({ id: objectIdSchema });

module.exports = { createBookingSchema, cancelBookingSchema, objectIdParamSchema };

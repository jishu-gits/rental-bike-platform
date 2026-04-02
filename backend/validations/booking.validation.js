// RidePulse — Zod schemas for booking create/cancel request validation
const { z } = require('zod');

const objectIdRegex = /^[a-f\d]{24}$/i;

const createBookingSchema = z
  .object({
    bikeId: z
      .string({ required_error: 'Bike ID is required' })
      .regex(objectIdRegex, 'bikeId must be a valid MongoDB ObjectId (24-char hex)'),

    startDate: z
      .string({ required_error: 'Start date is required' })
      .refine(
        (val) => !isNaN(Date.parse(val)) && new Date(val) > new Date(),
        'startDate must be a valid future date'
      ),

    endDate: z
      .string({ required_error: 'End date is required' })
      .refine(
        (val) => !isNaN(Date.parse(val)),
        'endDate must be a valid date'
      ),

    planType: z
      .enum(['hourly', 'daily', 'weekly', 'monthly'], {
        errorMap: () => ({ message: 'planType must be one of: hourly, daily, weekly, monthly' }),
      })
      .optional()
      .default('daily'),

    deliveryType: z
      .enum(['pickup', 'doorstep'], {
        errorMap: () => ({ message: 'deliveryType must be pickup or doorstep' }),
      })
      .optional()
      .default('pickup'),

    deliveryAddress: z
      .object({
        street: z.string().optional(),
        city: z.string().optional(),
        pincode: z.string().optional(),
      })
      .optional(),

    deliverySlot: z.string().optional(),
    hours: z.number().int().min(1).optional().default(0),
    useWallet: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    // Cross-field validation: endDate must be after startDate
    if (data.startDate && data.endDate) {
      if (new Date(data.endDate) <= new Date(data.startDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDate'],
          message: 'endDate must be after startDate',
        });
      }
    }
    // For doorstep delivery, deliveryAddress.city is required
    if (data.deliveryType === 'doorstep' && !data.deliveryAddress?.city) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['deliveryAddress', 'city'],
        message: 'Delivery city is required for doorstep delivery',
      });
    }
  });

// For validating :id route params
const objectIdParamSchema = z.object({
  id: z
    .string()
    .regex(objectIdRegex, 'ID must be a valid MongoDB ObjectId (24-char hex)'),
});

module.exports = { createBookingSchema, objectIdParamSchema };

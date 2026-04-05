// Simple validation test for booking logic
const { z } = require('zod');

// Copy the validation schema
const objectIdRegex = /^[a-f\d]{24}$/i;
const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid ObjectId');

const createBookingSchema = z.discriminatedUnion('planType', [
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
    deliveryAddress: z.object({ street: z.string().optional(), city: z.string().optional(), pincode: z.string().optional() }).optional(),
    deliverySlot: z.string().optional(),
    useWallet: z.boolean().default(false),
  }).superRefine((data, ctx) => {
    if (data.deliveryType === 'doorstep' && !data.deliveryAddress?.city) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Delivery city is required for doorstep delivery', path: ['deliveryAddress', 'city'] });
    }
  }),
  z.object({
    planType: z.literal('daily'),
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
    deliveryAddress: z.object({ street: z.string().optional(), city: z.string().optional(), pincode: z.string().optional() }).optional(),
    deliverySlot: z.string().optional(),
    useWallet: z.boolean().default(false),
  }).superRefine((data, ctx) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end <= start) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'End date must be after start date', path: ['endDate'] });
    }
  }),
  z.object({
    planType: z.literal('weekly'),
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
    deliveryAddress: z.object({ street: z.string().optional(), city: z.string().optional(), pincode: z.string().optional() }).optional(),
    deliverySlot: z.string().optional(),
    useWallet: z.boolean().default(false),
  }).superRefine((data, ctx) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end <= start) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'End date must be after start date', path: ['endDate'] });
    }
  }),
  z.object({
    planType: z.literal('monthly'),
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
    deliveryAddress: z.object({ street: z.string().optional(), city: z.string().optional(), pincode: z.string().optional() }).optional(),
    deliverySlot: z.string().optional(),
    useWallet: z.boolean().default(false),
  }).superRefine((data, ctx) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end <= start) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'End date must be after start date', path: ['endDate'] });
    }
  }),
]);

// Test cases
const testCases = [
  {
    name: 'Valid hourly booking',
    data: {
      planType: 'hourly',
      bikeId: '507f1f77bcf86cd799439011',
      date: '2024-12-25',
      startTime: '10:00',
      durationHours: 4,
      deliveryType: 'pickup',
      useWallet: false,
    },
    shouldPass: true,
  },
  {
    name: 'Valid daily booking',
    data: {
      planType: 'daily',
      bikeId: '507f1f77bcf86cd799439011',
      startDate: '2024-12-25',
      endDate: '2024-12-27',
      deliveryType: 'pickup',
      useWallet: false,
    },
    shouldPass: true,
  },
  {
    name: 'Invalid hourly - past date',
    data: {
      planType: 'hourly',
      bikeId: '507f1f77bcf86cd799439011',
      date: '2024-01-01',
      startTime: '10:00',
      durationHours: 4,
      deliveryType: 'pickup',
      useWallet: false,
    },
    shouldPass: false,
  },
  {
    name: 'Invalid daily - end before start',
    data: {
      planType: 'daily',
      bikeId: '507f1f77bcf86cd799439011',
      startDate: '2024-12-27',
      endDate: '2024-12-25',
      deliveryType: 'pickup',
      useWallet: false,
    },
    shouldPass: false,
  },
];

console.log('Testing booking validation schema...\n');

testCases.forEach((testCase, index) => {
  try {
    const result = createBookingSchema.parse(testCase.data);
    const passed = testCase.shouldPass;
    console.log(`Test ${index + 1}: ${testCase.name} - ${passed ? 'PASS ✓' : 'FAIL ✗'}`);
    if (!passed) {
      console.log('  Expected to fail but passed');
    }
  } catch (error) {
    const passed = !testCase.shouldPass;
    console.log(`Test ${index + 1}: ${testCase.name} - ${passed ? 'PASS ✓' : 'FAIL ✗'}`);
    if (!passed) {
      console.log('  Expected to pass but failed:', error.message);
    }
  }
});

console.log('\nValidation test completed.');
// RidePulse — Zod schemas for bike create/update request validation
const { z } = require('zod');

const addBikeSchema = z.object({
  name: z
    .string({ required_error: 'Bike name is required' })
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must not exceed 100 characters'),

  category: z.enum(
    ['Sports', 'Cruiser', 'Scooter', 'Standard', 'Electric'],
    { errorMap: () => ({ message: 'Category must be one of: Sports, Cruiser, Scooter, Standard, Electric' }) }
  ),

  fuelType: z.enum(
    ['petrol', 'electric', 'hybrid'],
    { errorMap: () => ({ message: 'Fuel type must be petrol, electric, or hybrid' }) }
  ),

  pricePerDay: z
    .number({ required_error: 'Price per day is required', invalid_type_error: 'Price must be a number' })
    .positive('Price must be positive')
    .max(10000, 'Price cannot exceed ₹10,000 per day'),

  city: z
    .string({ required_error: 'City is required' })
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City name is too long'),

  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),

  available: z.boolean().optional().default(true),
});

// All fields optional — but at least one must be provided
const updateBikeSchema = addBikeSchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    'At least one field must be provided for update'
  );

module.exports = { addBikeSchema, updateBikeSchema };

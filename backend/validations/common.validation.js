// RidePulse — Common reusable validation schemas
const { z } = require('zod');

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId');

module.exports = { objectIdSchema };

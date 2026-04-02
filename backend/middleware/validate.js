// RidePulse — Zod validation middleware factory for request `body`, `query`, and `params`
const { ZodError } = require('zod');
const AppError = require('../utils/AppError');

/**
 * Returns an Express middleware that validates req[source] against a Zod schema.
 * On failure, formats Zod issues as a single AppError string and calls next(err).
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body' | 'query' | 'params'} source - Which part of the request to validate
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  try {
    req[source] = schema.parse(req[source]);
    return next();
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.errors.map((e) => {
        const path = e.path && e.path.length ? e.path.join('.') : source;
        return `${path}: ${e.message}`;
      });
      return next(new AppError(messages.join('. '), 400));
    }
    return next(err);
  }
};

module.exports = validate;

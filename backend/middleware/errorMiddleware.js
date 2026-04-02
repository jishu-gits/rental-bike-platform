// RidePulse — Centralized Express error handler for all operational and unexpected errors
const AppError = require('../utils/AppError');

// Transform Mongoose/JWT errors into clean AppError instances
function transformError(err) {
  // Mongoose: bad ObjectId
  if (err.name === 'CastError') {
    return new AppError(`Invalid ${err.path}: ${err.value}`, 400);
  }

  // Mongoose: duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    return new AppError(
      `"${value}" is already in use for field "${field}". Please use a different value.`,
      409
    );
  }

  // Mongoose: validation errors (multiple fields)
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return new AppError(`Validation failed: ${messages.join('. ')}`, 400);
  }

  // JWT: malformed token
  if (err.name === 'JsonWebTokenError') {
    return new AppError('Invalid token. Please log in again.', 401);
  }

  // JWT: token expired
  if (err.name === 'TokenExpiredError') {
    return new AppError('Your session has expired. Please log in again.', 401);
  }

  return err;
}

// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
  const error = transformError(err);

  const statusCode = error.statusCode || 500;
  const status = error.status || 'error';
  const message = error.isOperational
    ? error.message
    : 'Something went wrong. Please try again later.';

  // Development: include stack + raw error for debugging
  if (process.env.NODE_ENV === 'development') {
    return res.status(statusCode).json({
      success: false,
      status,
      message,
      stack: error.stack,
      error: err,
    });
  }

  // Production: never expose stack traces or internal details
  res.status(statusCode).json({ success: false, message });
};

module.exports = errorMiddleware;

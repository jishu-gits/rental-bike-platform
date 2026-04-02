// RidePulse — Admin-only access guard middleware
const AppError = require('../utils/AppError');

const adminMiddleware = (req, res, next) => {
  if (!req.user) return next(new AppError('Authentication required', 401));
  if (req.user.role !== 'admin') {
    return next(new AppError('Admin access required. You do not have permission to perform this action.', 403));
  }
  next();
};

module.exports = adminMiddleware;

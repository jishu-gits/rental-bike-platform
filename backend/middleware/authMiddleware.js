const jwt = require('jsonwebtoken');

const authMiddleware = (roles = []) => {
  return (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ message: "No token provided, authorization denied." });

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_please_change_in_production');
      req.user = decoded;

      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden: You do not have the required permissions." });
      }

      next();
    } catch (err) {
      res.status(401).json({ message: "Invalid or expired token." });
    }
  };
};

module.exports = authMiddleware;

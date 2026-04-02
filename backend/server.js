// RidePulse — Express HTTP + Socket.io server entrypoint with security middleware
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const AppError = require('./utils/AppError');
const errorMiddleware = require('./middleware/errorMiddleware');

const authRoutes         = require('./routes/authRoutes');
const bikeRoutes         = require('./routes/bikeRoutes');
const bookingRoutes      = require('./routes/bookingRoutes');
const kycRoutes          = require('./routes/kycRoutes');
const walletRoutes       = require('./routes/walletRoutes');
const referralRoutes     = require('./routes/referralRoutes');
const reviewRoutes       = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const supportRoutes      = require('./routes/supportRoutes');
const paymentRoutes      = require('./routes/paymentRoutes');
const adminRoutes        = require('./routes/adminRoutes');
const chatRoutes         = require('./routes/chatRoutes');

// ─── Startup guards ─────────────────────────────────────────────────────────
if (!process.env.MONGODB_URI) {
  console.error('FATAL: MONGODB_URI environment variable is not set.');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set.');
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);

// ─── Security headers ────────────────────────────────────────────────────────
app.use(helmet());

// ─── Request logger (method + url + status + time only — no bodies) ──────────
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat));

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://rental-bike-platform.vercel.app',
  /\.vercel\.app$/,
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some((o) =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    if (allowed) return callback(null, true);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ─── Body parsing (JSON) ─────────────────────────────────────────────────────
// Note: /api/payments/webhook uses express.raw — applied in paymentRoutes.js
app.use(express.json());

// ─── Rate limiting ───────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please wait 15 minutes.' },
});

app.use('/api/', generalLimiter);
app.use('/api/auth/', strictLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/bikes',         bikeRoutes);
app.use('/api/bookings',      bookingRoutes);
app.use('/api/kyc',           kycRoutes);
app.use('/api/wallet',        walletRoutes);
app.use('/api/referral',      referralRoutes);
app.use('/api/reviews',       reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support',       supportRoutes);
app.use('/api/payments',      paymentRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/chat',          chatRoutes);

app.get('/', (req, res) => res.json({ success: true, message: 'RidePulse API is running! 🏍️' }));

// ─── Unhandled routes ─────────────────────────────────────────────────────────
app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

// ─── Centralized error handler (MUST be last middleware) ──────────────────────
app.use(errorMiddleware);

// ─── Socket.io ───────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Authenticate socket connections with JWT
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Unauthorized: no token'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch {
    next(new Error('Unauthorized: invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.userId}`);
  socket.on('disconnect', () => {});
});

// Export io for use in routes/utils
app.set('io', io);

// Export app and io early so workers/schedulers can access Socket.io
module.exports = { app, io };

// ─── Start cron jobs ─────────────────────────────────────────────────────────
try {
  require('./schedulers/cronJobs');
} catch (e) {
  console.warn('Cron jobs could not start:', e.message);
}

// ─── Database + server startup ───────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

// ─── Process-level error handling ────────────────────────────────────────────
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err.name, err.message);
  httpServer.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.name, err.message);
  process.exit(1);
});

// (exports already assigned above)

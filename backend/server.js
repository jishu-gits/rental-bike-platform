const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const bikeRoutes = require('./routes/bikeRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

const app = express();

// Startup guard — crash early if critical env vars are missing
if (!process.env.MONGODB_URI) {
  console.error('FATAL: MONGODB_URI environment variable is not set.');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set.');
  process.exit(1);
}

// Middleware
const allowedOrigins = [
  'https://rental-bike-platform.vercel.app',
  /\.vercel\.app$/  // also allow preview deploy URLs
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. Render health checks, curl)
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some(o =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    if (allowed) return callback(null, true);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bikes', bikeRoutes);
app.use('/api/bookings', bookingRoutes);

app.get('/', (req, res) => {
  res.send('Rental Bike Platform API is running!');
});

// Database Connection
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit with failure so Render logs it as a crash and not just 'Application exited early'
  });

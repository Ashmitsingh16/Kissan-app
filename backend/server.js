const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();
require('./config/production')();

// Connect to database
connectDB();

const app = express();
require('./middleware/rateLimit').configureProxy(app);

// Middleware
const origins = (process.env.CORS_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean);
app.use(cors({ origin: (origin, done) => {
  if (!origin || origins.includes(origin) || (!origins.length && process.env.NODE_ENV !== 'production')) return done(null, true);
  done(Object.assign(new Error('Origin is not allowed'), { status: 403 }));
} }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/farms', require('./routes/farm'));
app.use('/api/appointments', require('./routes/appointment'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/support', require('./routes/support'));
app.use('/api/maps', require('./routes/maps'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Kisan App API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

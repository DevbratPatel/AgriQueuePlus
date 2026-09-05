const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Root & Health Check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    system: 'AgriQueue+ REST API Server',
    version: '1.0.0',
    endpoints: [
      '/api/auth',
      '/api/msp',
      '/api/centers',
      '/api/bookings',
      '/api/complaints',
      '/api/agent',
      '/api/admin'
    ]
  });
});

// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/msp', require('./routes/mspRoutes'));
app.use('/api/centers', require('./routes/centerRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/agent', require('./routes/agentRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API Route ${req.originalUrl} not found`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🌾 AgriQueue+ Backend running on http://localhost:${PORT}`);
  console.log(`📡 Ready to handle Farmer, Admin & Agent requests`);
  console.log('====================================================');
});
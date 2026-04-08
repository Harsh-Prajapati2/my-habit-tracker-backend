const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();

const app = express();

// Middleware
app.use(compression()); // Compress responses
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/habit-tracker')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection failed:', err));

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/habits', require('./routes/habits'));
app.use('/api/completions', require('./routes/completions'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/goals', require('./routes/goals'));

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

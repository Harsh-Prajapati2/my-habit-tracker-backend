const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Please provide a habit name'],
    trim: true,
    maxlength: 50,
  },
  description: {
    type: String,
    maxlength: 200,
  },
  category: {
    type: String,
    enum: ['Health', 'Fitness', 'Learning', 'Work', 'Personal', 'Other'],
    required: true,
  },
  color: {
    type: String,
    default: '#3b82f6',
  },
  scheduledTimes: [
    {
      type: String,
      required: true,
      // Format: "HH:MM" e.g., "06:00", "12:00"
    },
  ],
  repeatDays: [
    {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },
  ],
  timezone: {
    type: String,
    default: 'UTC',
  },
  reminder: {
    enabled: Boolean,
    minutesBefore: Number,
  },
  goal: {
    type: String,
    maxlength: 50,
  },
  notes: {
    type: String,
    maxlength: 500,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes
habitSchema.index({ userId: 1, createdAt: -1 });
habitSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Habit', habitSchema);

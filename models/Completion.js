const mongoose = require('mongoose');

const completionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  habitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Habit',
    required: true,
  },
  completedDate: {
    type: Date,
    required: true,
  },
  completedAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure unique combination of userId, habitId, and completedDate
completionSchema.index({ userId: 1, habitId: 1, completedDate: 1 }, { unique: true });
completionSchema.index({ userId: 1, completedDate: -1 });

module.exports = mongoose.model('Completion', completionSchema);

const mongoose = require('mongoose');

const goalTaskSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a goal task title'],
      trim: true,
      maxlength: 120,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const goalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Please provide a goal title'],
    trim: true,
    maxlength: 120,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 240,
    default: '',
  },
  category: {
    type: String,
    required: [true, 'Please provide a goal topic/category'],
    trim: true,
    maxlength: 60,
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium',
  },
  startDate: {
    type: Date,
    required: [true, 'Please provide a start date'],
  },
  endDate: {
    type: Date,
    required: [true, 'Please provide an end date'],
  },
  tasks: {
    type: [goalTaskSchema],
    validate: {
      validator: (value) => Array.isArray(value) && value.length > 0,
      message: 'Please provide at least one goal task',
    },
  },
  completed: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
    default: null,
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

goalSchema.index({ userId: 1, category: 1, createdAt: -1 });
goalSchema.index({ userId: 1, completed: 1, priority: 1, endDate: 1 });

module.exports = mongoose.model('Goal', goalSchema);

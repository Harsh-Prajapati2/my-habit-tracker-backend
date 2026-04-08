const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a subtask title'],
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

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Please provide a task title'],
    trim: true,
    maxlength: 120,
  },
  category: {
    type: String,
    required: [true, 'Please provide a task topic/category'],
    trim: true,
    maxlength: 60,
  },
  subtasks: {
    type: [subtaskSchema],
    validate: {
      validator: (value) => Array.isArray(value) && value.length > 0,
      message: 'Please provide at least one subtask',
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

taskSchema.index({ userId: 1, category: 1, createdAt: -1 });
taskSchema.index({ userId: 1, completed: 1, category: 1 });

module.exports = mongoose.model('Task', taskSchema);

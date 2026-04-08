const mongoose = require('mongoose');

const taskTopicSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Please provide a task topic name'],
    trim: true,
    maxlength: 60,
  },
  nameKey: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60,
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

taskTopicSchema.pre('validate', function normalizeTaskTopic() {
  const normalizedName = typeof this.name === 'string' ? this.name.trim() : '';
  this.name = normalizedName;
  this.nameKey = normalizedName.toLowerCase();
  this.updatedAt = new Date();
});

taskTopicSchema.index({ userId: 1, nameKey: 1 }, { unique: true });
taskTopicSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('TaskTopic', taskTopicSchema);

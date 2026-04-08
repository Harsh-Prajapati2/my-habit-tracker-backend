const Task = require('../models/Task');
const TaskTopic = require('../models/TaskTopic');
const { buildCompletionMeta, normalizeChecklist, sanitizeText, sortChecklist } = require('../utils/planner');

const formatTaskTopic = (topic) => ({
  id: topic._id.toString(),
  name: topic.name,
  createdAt: topic.createdAt,
  updatedAt: topic.updatedAt,
});

const formatTask = (task) => ({
  id: task._id.toString(),
  title: task.title,
  mainTopic: task.category,
  category: task.category,
  subtasks: sortChecklist(task.subtasks || []).map((subtask) => ({
    id: subtask.id,
    title: subtask.title,
    completed: Boolean(subtask.completed),
    order: Number.isFinite(subtask.order) ? subtask.order : 0,
  })),
  completed: Boolean(task.completed),
  completedAt: task.completedAt,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
});

const ensureTaskTopic = async (userId, rawName) => {
  const name = sanitizeText(rawName);
  if (!name) {
    return { topic: null, created: false };
  }

  const nameKey = name.toLowerCase();
  const existing = await TaskTopic.findOne({ userId, nameKey });
  if (existing) {
    return { topic: existing, created: false };
  }

  const createdTopic = await TaskTopic.create({
    userId,
    name,
    nameKey,
  });

  return { topic: createdTopic, created: true };
};

const syncTaskTopics = async (userId) => {
  const existingCategories = await Task.find({ userId }).distinct('category');
  await Promise.all(existingCategories.map((category) => ensureTaskTopic(userId, category)));
};

const buildTaskPayload = (body, previous = null) => {
  const title = sanitizeText(body.title ?? previous?.title);
  const category = sanitizeText(body.mainTopic ?? body.category ?? previous?.category);
  const subtasks = normalizeChecklist(body.subtasks ?? previous?.subtasks, 'subtask');

  if (!title) {
    return { error: 'Task title is required' };
  }

  if (!category) {
    return { error: 'Task main topic is required' };
  }

  if (!subtasks.length) {
    return { error: 'Add at least one subtask' };
  }

  const { completed, completedAt } = buildCompletionMeta(subtasks, previous?.completedAt);

  return {
    payload: {
      title,
      category,
      subtasks,
      completed,
      completedAt,
      updatedAt: new Date(),
    },
  };
};

// @desc    Create task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
  try {
    const { payload, error } = buildTaskPayload(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    await ensureTaskTopic(req.user.id, payload.category);

    const task = await Task.create({
      userId: req.user.id,
      ...payload,
    });

    return res.status(201).json({ success: true, data: formatTask(task) });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all tasks for user
// @route   GET /api/tasks
// @access  Private
const getAllTasks = async (req, res) => {
  try {
    await syncTaskTopics(req.user.id);

    const tasks = await Task.find({ userId: req.user.id }).sort({
      category: 1,
      completed: 1,
      createdAt: -1,
    });

    return res.json({ success: true, data: tasks.map(formatTask) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task || task.userId.toString() !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const { payload, error } = buildTaskPayload(req.body, task);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    await ensureTaskTopic(req.user.id, payload.category);

    Object.assign(task, payload);
    await task.save();

    return res.json({ success: true, data: formatTask(task) });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Toggle full task completion
// @route   PATCH /api/tasks/:id/toggle-complete
// @access  Private
const toggleTaskComplete = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task || task.userId.toString() !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const nextCompleted = !task.completed;
    task.subtasks = (task.subtasks || []).map((subtask, index) => ({
      id: subtask.id,
      title: subtask.title,
      completed: nextCompleted,
      order: Number.isFinite(subtask.order) ? subtask.order : index,
    }));
    task.completed = nextCompleted;
    task.completedAt = nextCompleted ? new Date() : null;
    task.updatedAt = new Date();

    await task.save();

    return res.json({ success: true, data: formatTask(task) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task || task.userId.toString() !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await Task.findByIdAndDelete(req.params.id);

    return res.json({ success: true, data: {} });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create task topic
// @route   POST /api/tasks/topics
// @access  Private
const createTaskTopic = async (req, res) => {
  try {
    const name = sanitizeText(req.body?.name);
    if (!name) {
      return res.status(400).json({ success: false, message: 'Task main topic name is required' });
    }

    const { topic, created } = await ensureTaskTopic(req.user.id, name);
    return res.status(created ? 201 : 200).json({
      success: true,
      data: formatTaskTopic(topic),
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all task topics
// @route   GET /api/tasks/topics
// @access  Private
const getTaskTopics = async (req, res) => {
  try {
    await syncTaskTopics(req.user.id);
    const topics = await TaskTopic.find({ userId: req.user.id }).sort({ name: 1, createdAt: 1 });
    return res.json({ success: true, data: topics.map(formatTaskTopic) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createTaskTopic,
  createTask,
  deleteTask,
  getAllTasks,
  getTaskTopics,
  toggleTaskComplete,
  updateTask,
};

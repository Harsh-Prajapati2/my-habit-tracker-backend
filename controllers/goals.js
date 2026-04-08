const Goal = require('../models/Goal');
const GoalTopic = require('../models/GoalTopic');
const { buildCompletionMeta, normalizeChecklist, sanitizeText, sortChecklist } = require('../utils/planner');
const DEFAULT_GOAL_TOPIC_NAME = 'General';

const formatGoalTopic = (topic) => ({
  id: topic._id.toString(),
  name: topic.name,
  createdAt: topic.createdAt,
  updatedAt: topic.updatedAt,
});

const formatGoal = (goal) => ({
  id: goal._id.toString(),
  title: goal.title,
  description: goal.description || '',
  mainTopic: goal.category,
  category: goal.category,
  priority: goal.priority,
  startDate: goal.startDate,
  endDate: goal.endDate,
  tasks: sortChecklist(goal.tasks || []).map((task) => ({
    id: task.id,
    title: task.title,
    completed: Boolean(task.completed),
    order: Number.isFinite(task.order) ? task.order : 0,
  })),
  completed: Boolean(goal.completed),
  completedAt: goal.completedAt,
  createdAt: goal.createdAt,
  updatedAt: goal.updatedAt,
});

const ensureGoalTopic = async (userId, rawName) => {
  const name = sanitizeText(rawName);
  if (!name) {
    return { topic: null, created: false };
  }

  const nameKey = name.toLowerCase();
  const existing = await GoalTopic.findOne({ userId, nameKey });
  if (existing) {
    return { topic: existing, created: false };
  }

  const createdTopic = await GoalTopic.create({
    userId,
    name,
    nameKey,
  });

  return { topic: createdTopic, created: true };
};

const syncGoalTopics = async (userId) => {
  const existingCategories = await Goal.find({ userId }).distinct('category');
  await Promise.all(existingCategories.map((category) => ensureGoalTopic(userId, category)));
};

const buildGoalPayload = (body, previous = null) => {
  const title = sanitizeText(body.title ?? previous?.title);
  const description =
    body.description !== undefined ? sanitizeText(body.description) : previous?.description || '';
  const category = sanitizeText(body.mainTopic ?? body.category ?? previous?.category);
  const priority = sanitizeText(body.priority ?? previous?.priority) || 'medium';
  const startDate = new Date(body.startDate ?? previous?.startDate);
  const endDate = new Date(body.endDate ?? previous?.endDate);
  const tasks = normalizeChecklist(body.tasks ?? previous?.tasks, 'goal-task');

  if (!title) {
    return { error: 'Goal title is required' };
  }

  if (!category) {
    return { error: 'Goal main topic is required' };
  }

  if (!['high', 'medium', 'low'].includes(priority)) {
    return { error: 'Goal priority must be high, medium, or low' };
  }

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { error: 'Start and end dates are required' };
  }

  if (endDate < startDate) {
    return { error: 'End date must be on or after the start date' };
  }

  if (!tasks.length) {
    return { error: 'Add at least one goal task' };
  }

  const { completed, completedAt } = buildCompletionMeta(tasks, previous?.completedAt);

  return {
    payload: {
      title,
      description,
      category,
      priority,
      startDate,
      endDate,
      tasks,
      completed,
      completedAt,
      updatedAt: new Date(),
    },
  };
};

// @desc    Create goal
// @route   POST /api/goals
// @access  Private
const createGoal = async (req, res) => {
  try {
    const { payload, error } = buildGoalPayload(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    await ensureGoalTopic(req.user.id, payload.category);

    const goal = await Goal.create({
      userId: req.user.id,
      ...payload,
    });

    return res.status(201).json({ success: true, data: formatGoal(goal) });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all goals
// @route   GET /api/goals
// @access  Private
const getAllGoals = async (req, res) => {
  try {
    await syncGoalTopics(req.user.id);

    const goals = await Goal.find({ userId: req.user.id }).sort({
      category: 1,
      completed: 1,
      priority: 1,
      endDate: 1,
      createdAt: -1,
    });

    return res.json({ success: true, data: goals.map(formatGoal) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update goal
// @route   PUT /api/goals/:id
// @access  Private
const updateGoal = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal || goal.userId.toString() !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    const { payload, error } = buildGoalPayload(req.body, goal);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    await ensureGoalTopic(req.user.id, payload.category);

    Object.assign(goal, payload);
    await goal.save();

    return res.json({ success: true, data: formatGoal(goal) });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Toggle full goal completion
// @route   PATCH /api/goals/:id/toggle-complete
// @access  Private
const toggleGoalComplete = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal || goal.userId.toString() !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    const nextCompleted = !goal.completed;
    goal.tasks = (goal.tasks || []).map((task, index) => ({
      id: task.id,
      title: task.title,
      completed: nextCompleted,
      order: Number.isFinite(task.order) ? task.order : index,
    }));
    goal.completed = nextCompleted;
    goal.completedAt = nextCompleted ? new Date() : null;
    goal.updatedAt = new Date();

    await goal.save();

    return res.json({ success: true, data: formatGoal(goal) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete goal
// @route   DELETE /api/goals/:id
// @access  Private
const deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal || goal.userId.toString() !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    await Goal.findByIdAndDelete(req.params.id);

    return res.json({ success: true, data: {} });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create goal topic
// @route   POST /api/goals/topics
// @access  Private
const createGoalTopic = async (req, res) => {
  try {
    const name = sanitizeText(req.body?.name);
    if (!name) {
      return res.status(400).json({ success: false, message: 'Goal main topic name is required' });
    }

    const { topic, created } = await ensureGoalTopic(req.user.id, name);
    return res.status(created ? 201 : 200).json({
      success: true,
      data: formatGoalTopic(topic),
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all goal topics
// @route   GET /api/goals/topics
// @access  Private
const getGoalTopics = async (req, res) => {
  try {
    await syncGoalTopics(req.user.id);
    const topics = await GoalTopic.find({ userId: req.user.id }).sort({ name: 1, createdAt: 1 });
    return res.json({ success: true, data: topics.map(formatGoalTopic) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Rename goal topic
// @route   PUT /api/goals/topics/:id
// @access  Private
const updateGoalTopic = async (req, res) => {
  try {
    const topic = await GoalTopic.findById(req.params.id);

    if (!topic || topic.userId.toString() !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Goal topic not found' });
    }

    const nextName = sanitizeText(req.body?.name);
    if (!nextName) {
      return res.status(400).json({ success: false, message: 'Goal main topic name is required' });
    }

    const nextNameKey = nextName.toLowerCase();
    const conflictingTopic = await GoalTopic.findOne({
      userId: req.user.id,
      nameKey: nextNameKey,
      _id: { $ne: topic._id },
    });

    if (conflictingTopic) {
      return res.status(409).json({ success: false, message: 'A goal topic with this name already exists' });
    }

    const previousName = topic.name;
    topic.name = nextName;
    topic.nameKey = nextNameKey;
    topic.updatedAt = new Date();
    await topic.save();

    if (previousName !== nextName) {
      await Goal.updateMany(
        { userId: req.user.id, category: previousName },
        { $set: { category: nextName, updatedAt: new Date() } }
      );
    }

    return res.json({ success: true, data: formatGoalTopic(topic) });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete goal topic
// @route   DELETE /api/goals/topics/:id
// @access  Private
const deleteGoalTopic = async (req, res) => {
  try {
    const topic = await GoalTopic.findById(req.params.id);

    if (!topic || topic.userId.toString() !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Goal topic not found' });
    }

    const goalCount = await Goal.countDocuments({ userId: req.user.id, category: topic.name });
    let reassignedTopic = null;

    if (goalCount > 0) {
      if (topic.nameKey === DEFAULT_GOAL_TOPIC_NAME.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: 'Move goals out of General before deleting this topic',
        });
      }

      const ensured = await ensureGoalTopic(req.user.id, DEFAULT_GOAL_TOPIC_NAME);
      reassignedTopic = ensured.topic;

      await Goal.updateMany(
        { userId: req.user.id, category: topic.name },
        { $set: { category: reassignedTopic.name, updatedAt: new Date() } }
      );
    }

    await GoalTopic.findByIdAndDelete(topic._id);

    return res.json({
      success: true,
      data: {
        id: topic._id.toString(),
        deletedName: topic.name,
        reassignedCount: goalCount,
        reassignedTopic: reassignedTopic ? formatGoalTopic(reassignedTopic) : null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createGoalTopic,
  createGoal,
  deleteGoal,
  deleteGoalTopic,
  getAllGoals,
  getGoalTopics,
  toggleGoalComplete,
  updateGoal,
  updateGoalTopic,
};

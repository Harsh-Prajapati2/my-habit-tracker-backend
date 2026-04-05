const Completion = require('../models/Completion');
const Habit = require('../models/Habit');
const cache = require('../utils/cache');

// @desc    Mark habit complete for today
// @route   POST /api/completions
// @access  Private
const markHabitComplete = async (req, res, next) => {
  try {
    const { habitId } = req.body;
    const userId = req.user.id;

    if (!habitId) {
      return res.status(400).json({ success: false, message: 'Please provide habitId' });
    }

    // Check habit exists
    const habit = await Habit.findById(habitId);
    if (!habit || habit.userId.toString() !== userId) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }

    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already completed today
    let completion = await Completion.findOne({
      userId,
      habitId,
      completedDate: today,
    });

    if (completion) {
      return res.status(200).json({ success: true, data: completion, alreadyCompleted: true });
    }

    // Create completion record
    completion = await Completion.create({
      userId,
      habitId,
      completedDate: today,
    });

    // Invalidate dashboard cache
    cache.invalidate(`dashboard:${userId}`);

    res.status(201).json({ success: true, data: completion });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get completions for today
// @route   GET /api/completions/today
// @access  Private
const getCompletionsForToday = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completions = await Completion.find({
      userId: req.user.id,
      completedDate: today,
    }).populate('habitId', 'name category');

    res.json({ success: true, data: completions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get completion history for a habit
// @route   GET /api/completions/habit/:habitId
// @access  Private
const getCompletionHistory = async (req, res, next) => {
  try {
    const { habitId } = req.params;

    const completions = await Completion.find({
      userId: req.user.id,
      habitId,
    }).sort({ completedDate: -1 });

    res.json({ success: true, data: completions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get completion stats
// @route   GET /api/completions/stats
// @access  Private
const getCompletionStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active habits
    const habits = await Habit.find({ userId: req.user.id, isActive: true });

    // Get today's completions
    const completedToday = await Completion.countDocuments({
      userId: req.user.id,
      completedDate: today,
    });

    const totalHabits = habits.length;
    const remainingToday = totalHabits - completedToday;

    // Calculate streaks for each habit
    const streaks = {};
    for (const habit of habits) {
      let streak = 0;
      let currentDate = new Date(today);

      while (true) {
        const completion = await Completion.findOne({
          userId: req.user.id,
          habitId: habit._id,
          completedDate: new Date(currentDate),
        });

        if (!completion) break;

        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      }

      streaks[habit._id] = streak;
    }

    res.json({
      success: true,
      data: {
        totalHabits,
        completedToday,
        remainingToday,
        streaks,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Undo completion
// @route   DELETE /api/completions/:id
// @access  Private
const undoCompletion = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const completion = await Completion.findById(req.params.id);

    if (!completion || completion.userId.toString() !== userId) {
      return res.status(404).json({ success: false, message: 'Completion not found' });
    }

    await Completion.findByIdAndDelete(req.params.id);

    // Invalidate dashboard cache
    cache.invalidate(`dashboard:${userId}`);

    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  markHabitComplete,
  getCompletionsForToday,
  getCompletionHistory,
  getCompletionStats,
  undoCompletion,
};

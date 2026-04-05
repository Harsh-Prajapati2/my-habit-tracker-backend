const Habit = require('../models/Habit');
const Completion = require('../models/Completion');
const mongoose = require('mongoose');

// @desc    Get dashboard stats
// @route   GET /api/stats/dashboard
// @access  Private
const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active habits
    const habits = await Habit.find({ userId: req.user.id, isActive: true });
    const totalHabits = habits.length;

    // Get today's completions
    const todayCompletions = await Completion.find({
      userId: req.user.id,
      completedDate: today,
    });

    const completedToday = todayCompletions.length;
    const remainingToday = totalHabits - completedToday;

    // Calculate streaks
    const streaks = {};
    let longestStreak = 0;

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

      streaks[habit._id.toString()] = streak;
      if (streak > longestStreak) longestStreak = streak;
    }

    // Calculate weekly progress
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const weekCompletions = await Completion.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user.id),
          completedDate: { $gte: weekStart },
        },
      },
      {
        $group: {
          _id: '$habitId',
          count: { $sum: 1 },
        },
      },
    ]);

    const possibleCompletions = totalHabits * 7;
    const actualCompletions = weekCompletions.reduce((sum, item) => sum + item.count, 0);
    const weeklyProgress = possibleCompletions > 0 ? Math.round((actualCompletions / possibleCompletions) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalHabits,
        completedToday,
        remainingToday,
        longestStreak,
        streaks,
        weeklyProgress,
        habits: habits.map(h => ({
          id: h._id,
          name: h.name,
          category: h.category,
          color: h.color,
          scheduledTimes: h.scheduledTimes,
          isCompleted: todayCompletions.some(c => c.habitId.toString() === h._id.toString()),
          streak: streaks[h._id.toString()] || 0,
        })),
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDashboardStats,
};

const Habit = require('../models/Habit');
const Completion = require('../models/Completion');
const mongoose = require('mongoose');
const cache = require('../utils/cache');

// Optimized streak calculation using aggregation (avoids N+1 queries)
const calculateStreaksOptimized = async (userId, habitIds, today) => {
  if (!habitIds.length) return {};

  // Get all completions for user in last 365 days (max streak window)
  const yearAgo = new Date(today);
  yearAgo.setDate(yearAgo.getDate() - 365);

  const completions = await Completion.find({
    userId,
    habitId: { $in: habitIds },
    completedDate: { $gte: yearAgo, $lte: today },
  })
    .select('habitId completedDate')
    .lean();

  // Group completions by habit
  const completionsByHabit = {};
  for (const c of completions) {
    const hid = c.habitId.toString();
    if (!completionsByHabit[hid]) completionsByHabit[hid] = new Set();
    completionsByHabit[hid].add(c.completedDate.toISOString().split('T')[0]);
  }

  // Calculate streak for each habit
  const streaks = {};
  for (const habitId of habitIds) {
    const hid = habitId.toString();
    const dates = completionsByHabit[hid] || new Set();
    
    let streak = 0;
    let checkDate = new Date(today);
    
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (!dates.has(dateStr)) break;
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    streaks[hid] = streak;
  }

  return streaks;
};

// @desc    Get dashboard stats (OPTIMIZED - single endpoint for all dashboard data)
// @route   GET /api/stats/dashboard
// @access  Private
const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cacheKey = `dashboard:${userId}`;
    
    // Check cache first (15 second TTL for dashboard)
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parallel fetch: habits + today's completions
    const [habits, todayCompletions] = await Promise.all([
      Habit.find({ userId, isActive: true }).lean(),
      Completion.find({ userId, completedDate: today }).lean(),
    ]);

    const totalHabits = habits.length;
    const habitIds = habits.map(h => h._id);
    const completedTodaySet = new Set(todayCompletions.map(c => c.habitId.toString()));
    const completionIdMap = {};
    todayCompletions.forEach(c => {
      completionIdMap[c.habitId.toString()] = c._id.toString();
    });

    // Optimized streak calculation (single query instead of N)
    const streaks = await calculateStreaksOptimized(userId, habitIds, today);

    // Calculate weekly progress with aggregation
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const weekCompletions = await Completion.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          completedDate: { $gte: weekStart },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);

    const possibleCompletions = totalHabits * 7;
    const actualCompletions = weekCompletions[0]?.count || 0;
    const weeklyProgress = possibleCompletions > 0 
      ? Math.round((actualCompletions / possibleCompletions) * 100) 
      : 0;

    // Find longest streak
    let longestStreak = 0;
    for (const s of Object.values(streaks)) {
      if (s > longestStreak) longestStreak = s;
    }

    const completedToday = completedTodaySet.size;
    const remainingToday = totalHabits - completedToday;

    const responseData = {
      totalHabits,
      completedToday,
      remainingToday,
      longestStreak,
      streaks,
      weeklyProgress,
      // Include full habit data + today's completion IDs (eliminates separate API call)
      habits: habits.map(h => ({
        _id: h._id,
        id: h._id,
        name: h.name,
        description: h.description,
        category: h.category,
        color: h.color,
        scheduledTimes: h.scheduledTimes,
        repeatDays: h.repeatDays,
        goal: h.goal,
        notes: h.notes,
        isActive: h.isActive,
        isCompleted: completedTodaySet.has(h._id.toString()),
        completionId: completionIdMap[h._id.toString()] || null,
        streak: streaks[h._id.toString()] || 0,
      })),
      // Include completion mapping for undo functionality
      completionMap: completionIdMap,
      timestamp: Date.now(),
    };

    // Cache the result
    cache.set(cacheKey, responseData, 15000);

    res.json({ success: true, data: responseData });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDashboardStats,
};

const Habit = require('../models/Habit');

// @desc    Create habit
// @route   POST /api/habits
// @access  Private
const createHabit = async (req, res, next) => {
  try {
    const { name, description, category, color, scheduledTimes, repeatDays, reminder, goal, notes } = req.body;

    if (!name || !category || !scheduledTimes || scheduledTimes.length === 0 || !repeatDays || repeatDays.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, category, scheduled times, and repeat days',
      });
    }

    const habit = await Habit.create({
      userId: req.user.id,
      name,
      description,
      category,
      color,
      scheduledTimes,
      repeatDays,
      reminder,
      goal,
      notes,
    });

    res.status(201).json({ success: true, data: habit });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all habits for user
// @route   GET /api/habits
// @access  Private
const getAllHabits = async (req, res, next) => {
  try {
    const habits = await Habit.find({ userId: req.user.id }).sort({ createdAt: -1 });

    res.json({ success: true, data: habits });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single habit
// @route   GET /api/habits/:id
// @access  Private
const getHabitById = async (req, res, next) => {
  try {
    const habit = await Habit.findById(req.params.id);

    if (!habit || habit.userId.toString() !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }

    res.json({ success: true, data: habit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update habit
// @route   PUT /api/habits/:id
// @access  Private
const updateHabit = async (req, res, next) => {
  try {
    let habit = await Habit.findById(req.params.id);

    if (!habit || habit.userId.toString() !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }

    habit = await Habit.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, data: habit });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete habit
// @route   DELETE /api/habits/:id
// @access  Private
const deleteHabit = async (req, res, next) => {
  try {
    const habit = await Habit.findById(req.params.id);

    if (!habit || habit.userId.toString() !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }

    await Habit.findByIdAndDelete(req.params.id);

    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle habit active status
// @route   PATCH /api/habits/:id/toggle
// @access  Private
const toggleHabitActive = async (req, res, next) => {
  try {
    const habit = await Habit.findById(req.params.id);

    if (!habit || habit.userId.toString() !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }

    habit.isActive = !habit.isActive;
    await habit.save();

    res.json({ success: true, data: habit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createHabit,
  getAllHabits,
  getHabitById,
  updateHabit,
  deleteHabit,
  toggleHabitActive,
};

const express = require('express');
const {
  createHabit,
  getAllHabits,
  getHabitById,
  updateHabit,
  deleteHabit,
  toggleHabitActive,
} = require('../controllers/habits');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', createHabit);
router.get('/', getAllHabits);
router.get('/:id', getHabitById);
router.put('/:id', updateHabit);
router.delete('/:id', deleteHabit);
router.patch('/:id/toggle', toggleHabitActive);

module.exports = router;

const express = require('express');
const {
  markHabitComplete,
  getCompletionsForToday,
  getCompletionHistory,
  getCompletionStats,
  undoCompletion,
} = require('../controllers/completions');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', markHabitComplete);
router.get('/today', getCompletionsForToday);
router.get('/stats', getCompletionStats);
router.get('/habit/:habitId', getCompletionHistory);
router.delete('/:id', undoCompletion);

module.exports = router;

const express = require('express');
const {
  createGoalTopic,
  createGoal,
  deleteGoal,
  getAllGoals,
  getGoalTopics,
  toggleGoalComplete,
  updateGoal,
} = require('../controllers/goals');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/topics', createGoalTopic);
router.get('/topics', getGoalTopics);
router.post('/', createGoal);
router.get('/', getAllGoals);
router.put('/:id', updateGoal);
router.patch('/:id/toggle-complete', toggleGoalComplete);
router.delete('/:id', deleteGoal);

module.exports = router;

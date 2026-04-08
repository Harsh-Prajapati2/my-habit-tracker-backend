const express = require('express');
const {
  createGoalTopic,
  createGoal,
  deleteGoal,
  deleteGoalTopic,
  getAllGoals,
  getGoalTopics,
  toggleGoalComplete,
  updateGoal,
  updateGoalTopic,
} = require('../controllers/goals');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/topics', createGoalTopic);
router.get('/topics', getGoalTopics);
router.put('/topics/:id', updateGoalTopic);
router.delete('/topics/:id', deleteGoalTopic);
router.post('/', createGoal);
router.get('/', getAllGoals);
router.put('/:id', updateGoal);
router.patch('/:id/toggle-complete', toggleGoalComplete);
router.delete('/:id', deleteGoal);

module.exports = router;

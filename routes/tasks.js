const express = require('express');
const {
  createTaskTopic,
  createTask,
  deleteTask,
  deleteTaskTopic,
  getAllTasks,
  getTaskTopics,
  toggleTaskComplete,
  updateTask,
  updateTaskTopic,
} = require('../controllers/tasks');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/topics', createTaskTopic);
router.get('/topics', getTaskTopics);
router.put('/topics/:id', updateTaskTopic);
router.delete('/topics/:id', deleteTaskTopic);
router.post('/', createTask);
router.get('/', getAllTasks);
router.put('/:id', updateTask);
router.patch('/:id/toggle-complete', toggleTaskComplete);
router.delete('/:id', deleteTask);

module.exports = router;

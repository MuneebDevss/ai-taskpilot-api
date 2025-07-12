const express = require('express');
const TaskController = require('../controllers/taskController');
const { validateUserId, validateTaskId, validateTaskUpdate } = require('../middleware/validation');

const router = express.Router();
const taskController = new TaskController();

// GET /api/tasks - Get all tasks for a user
router.get('/', validateUserId, taskController.getAllTasks.bind(taskController));

// GET /api/tasks/:id - Get a specific task
router.get('/:id', validateTaskId, validateUserId, taskController.getTaskById.bind(taskController));

// PUT /api/tasks/:id - Update a task
router.put('/:id', validateTaskId, validateUserId, validateTaskUpdate, taskController.updateTask.bind(taskController));

// DELETE /api/tasks/:id - Delete a task
router.delete('/:id', validateTaskId, validateUserId, taskController.deleteTask.bind(taskController));

module.exports = router;

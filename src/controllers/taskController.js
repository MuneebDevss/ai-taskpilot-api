const TaskService = require('../services/taskService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

class TaskController {
  constructor() {
    this.taskService = new TaskService();
  }

  async getAllTasks(req, res) {
    try {
      const { userId = 'default' } = req.query;
      const tasks = await this.taskService.getAllTasks(userId);
      
      res.json(successResponse(tasks, 'Tasks retrieved successfully'));
    } catch (error) {
      console.error('Get all tasks error:', error);
      res.status(500).json(errorResponse('Failed to retrieve tasks', error.message));
    }
  }

  async getTaskById(req, res) {
    try {
      const { id } = req.params;
      const { userId = 'default' } = req.query;
      
      const task = await this.taskService.getTaskById(userId, id);
      
      res.json(successResponse(task, 'Task retrieved successfully'));
    } catch (error) {
      console.error('Get task by ID error:', error);
      const statusCode = error.message === 'Task not found' ? 404 : 500;
      res.status(statusCode).json(errorResponse(error.message));
    }
  }

  async updateTask(req, res) {
    try {
      const { id } = req.params;
      const { userId = 'default' } = req.query;
      const updateData = req.body;

      const task = await this.taskService.updateTask(userId, id, updateData);
      
      res.json(successResponse(task, 'Task updated successfully'));
    } catch (error) {
      console.error('Update task error:', error);
      const statusCode = error.message === 'Task not found' ? 404 : 500;
      res.status(statusCode).json(errorResponse(error.message));
    }
  }

  async deleteTask(req, res) {
    try {
      const { id } = req.params;
      const { userId = 'default' } = req.query;

      await this.taskService.deleteTask(userId, id);
      
      res.json(successResponse(null, 'Task deleted successfully'));
    } catch (error) {
      console.error('Delete task error:', error);
      const statusCode = error.message === 'Task not found' ? 404 : 500;
      res.status(statusCode).json(errorResponse(error.message));
    }
  }
}

module.exports = TaskController;


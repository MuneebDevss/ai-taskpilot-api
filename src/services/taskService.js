import TaskRepository  from '../repositories/taskRepository.js';
import ConflictService  from './conflictService.js';
import Database from '../config/database.js';
import Task from '../models/Task.js';
class TaskService {
  constructor() {
    this.taskRepository = new TaskRepository();
    this.conflictService = new ConflictService();
  }

  async getAllTasks(userId) {
    return await this.taskRepository.findByUserId(userId);
  }

  async getTaskById(userId, taskId) {
    const task = await this.taskRepository.findById(userId, taskId);
    if (!task) {
      throw new Error('Task not found');
    }
    return task;
  }

  async create(taskData) {
    try {
      const db = await Database.getInstance().initialize();
      const task = new Task(taskData);

      const validationErrors = task.validate();
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      const tasksRef = db.collection('users').doc(task.userId).collection(this.collectionName);
      const taskJson = task.toJSON();
      const docRef = await tasksRef.add(taskJson);

      // Return plain object, not Task instance
      return {
        ...taskJson,
        id: docRef.id
      };
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async updateTask(userId, taskId, updateData) {
    print(taskId);
    const existingTask = await this.taskRepository.findById(userId, taskId);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    return await this.taskRepository.update(userId, taskId, updateData);
  }

  async deleteTask(userId, taskId) {
    const existingTask = await this.taskRepository.findById(userId, taskId);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    return await this.taskRepository.delete(userId, taskId);
  }

  async findTaskByIdentifier(userId, identifier) {
    const tasks = await this.taskRepository.findByUserId(userId);
    return tasks.find(task =>
      task.id === identifier ||
      task.title.toLowerCase().includes(identifier.toLowerCase())
    );
  }
}
export default TaskService;

import TaskRepository  from '../repositories/taskRepository.js';
import ConflictService  from './conflictService.js';
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

  async createTask(taskData) {
    const existingTasks = await this.taskRepository.findByUserId(taskData.userId);
    const conflicts = this.conflictService.findTimeConflicts(taskData, existingTasks);

    if (conflicts.length > 0) {
      return {
        hasConflicts: true,
        conflicts,
        proposedTask: taskData
      };
    }

    const task = await this.taskRepository.create(taskData);
    return {
      hasConflicts: false,
      task
    };
  }

  async updateTask(userId, taskId, updateData) {
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

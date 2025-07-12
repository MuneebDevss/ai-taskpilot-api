import TaskService  from '../src/services/taskService.js';
import TaskRepository  from '../src/repositories/taskRepository.js';
import ConflictService  from '../src/services/conflictService.js';
jest.mock('../src/repositories/taskRepository.js');
jest.mock('../src/services/conflictService.js');
describe('TaskService', () => {
  let taskService;
  let mockTaskRepository;
  let mockConflictService;

  beforeEach(() => {
    mockTaskRepository = new TaskRepository();
    mockConflictService = new ConflictService();
    taskService = new TaskService();
    taskService.taskRepository = mockTaskRepository;
    taskService.conflictService = mockConflictService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllTasks', () => {
    it('should return all tasks for a user', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1' },
        { id: '2', title: 'Task 2' }
      ];
      mockTaskRepository.findByUserId.mockResolvedValue(mockTasks);

      const result = await taskService.getAllTasks('user1');

      expect(result).toEqual(mockTasks);
      expect(mockTaskRepository.findByUserId).toHaveBeenCalledWith('user1');
    });

    it('should handle repository errors', async () => {
      mockTaskRepository.findByUserId.mockRejectedValue(new Error('Database error'));

      await expect(taskService.getAllTasks('user1')).rejects.toThrow('Database error');
    });
  });

  describe('createTask', () => {
    it('should return conflicts when they exist', async () => {
      const taskData = {
        title: 'Conflicting Task',
        startDate: '2025-01-01T10:00:00Z',
        duration: 60
      };
      const existingTasks = [{ id: '2', title: 'Existing Task' }];
      const mockConflicts = [existingTasks[0]];

      mockTaskRepository.findByUserId.mockResolvedValue(existingTasks);
      mockConflictService.findTimeConflicts.mockReturnValue(mockConflicts);

      const result = await taskService.createTask(taskData);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toEqual(mockConflicts);
      expect(result.proposedTask).toEqual(taskData);
      expect(mockTaskRepository.create).not.toHaveBeenCalled();
    });
  });
  describe('updateTask', () => {
    it('should update a task if it exists', async () => {
      const existingTask = { id: '1', title: 'Old Task', userId: 'user1' };
      const updateData = { title: 'Updated Task' };
      const updatedTask = { ...existingTask, ...updateData };

      mockTaskRepository.findById.mockResolvedValue(existingTask);
      mockTaskRepository.update.mockResolvedValue(updatedTask);

      const result = await taskService.updateTask('user1', '1', updateData);

      expect(result).toEqual(updatedTask);
      expect(mockTaskRepository.findById).toHaveBeenCalledWith('user1', '1');
      expect(mockTaskRepository.update).toHaveBeenCalledWith('user1', '1', updateData);
    });

    it('should throw an error if task does not exist', async () => {
      mockTaskRepository.findById.mockResolvedValue(null);

      await expect(taskService.updateTask('user1', '404', { title: 'New' })).rejects.toThrow('Task not found');
    });
  });
  describe('deleteTask', () => {
    it('should delete the task if it exists', async () => {
      const task = { id: '1', title: 'Task to Delete', userId: 'user1' };
      mockTaskRepository.findById.mockResolvedValue(task);
      mockTaskRepository.delete.mockResolvedValue(true);

      const result = await taskService.deleteTask('user1', '1');

      expect(result).toBe(true);
      expect(mockTaskRepository.findById).toHaveBeenCalledWith('user1', '1');
      expect(mockTaskRepository.delete).toHaveBeenCalledWith('user1', '1');
    });

    it('should throw an error if task is not found', async () => {
      mockTaskRepository.findById.mockResolvedValue(null);

      await expect(taskService.deleteTask('user1', '999')).rejects.toThrow('Task not found');
    });
  });
  describe('findTaskByIdentifier', () => {
    it('should return a task by exact ID match', async () => {
      const tasks = [{ id: 'abc123', title: 'Some Task' }];
      mockTaskRepository.findByUserId.mockResolvedValue(tasks);

      const result = await taskService.findTaskByIdentifier('user1', 'abc123');

      expect(result).toEqual(tasks[0]);
    });

    it('should return a task by title match (case insensitive)', async () => {
      const tasks = [{ id: '1', title: 'Important Meeting' }];
      mockTaskRepository.findByUserId.mockResolvedValue(tasks);

      const result = await taskService.findTaskByIdentifier('user1', 'meeting');

      expect(result).toEqual(tasks[0]);
    });

    it('should return undefined if no match is found', async () => {
      mockTaskRepository.findByUserId.mockResolvedValue([
        { id: '1', title: 'Other Task' }
      ]);

      const result = await taskService.findTaskByIdentifier('user1', 'nothing');

      expect(result).toBeUndefined();
    });
  });

}
);

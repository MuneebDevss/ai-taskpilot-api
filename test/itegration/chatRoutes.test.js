import request from 'supertest';
import express from 'express';
import chatRoutes from '../routes/chatRoutes.js';
import AIService from '../../src/services/aiService.js';
import TaskService from '../../src/services/taskService.js';
import ConversationService from '../../src/services/conversationService.js';
import ConflictService from '../../src/services/conflictService.js';
import { validateChatMessage } from '../../src/middleware/validation.js';

// Mock all services
jest.mock('../../src/services/aiService.js');
jest.mock('../../src/services/taskService.js');
jest.mock('../../src/services/conversationService.js');
jest.mock('../../src/services/conflictService.js');
jest.mock('../../src/middleware/validation.js');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/chat', chatRoutes);

describe('Chat Routes', () => {
  let mockAIService;
  let mockTaskService;
  let mockConversationService;
  let mockConflictService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock validation middleware to pass through
    validateChatMessage.mockImplementation((req, res, next) => next());

    // Setup service mocks
    mockAIService = {
      parseUserInput: jest.fn()
    };
    mockTaskService = {
      getAllTasks: jest.fn(),
      createTask: jest.fn(),
      updateTask: jest.fn(),
      findTaskByIdentifier: jest.fn()
    };
    mockConversationService = {
      saveConversation: jest.fn()
    };
    mockConflictService = {
      suggestAlternativeTimes: jest.fn()
    };

    // Mock service constructors
    AIService.mockImplementation(() => mockAIService);
    TaskService.mockImplementation(() => mockTaskService);
    ConversationService.mockImplementation(() => mockConversationService);
    ConflictService.mockImplementation(() => mockConflictService);
  });

  describe('POST /api/chat', () => {
    const validRequestBody = {
      message: 'Create a task for tomorrow at 9 AM',
      userId: 'user123'
    };

    it('should process message successfully and create task', async () => {
      const existingTasks = [
        { id: 1, title: 'Existing Task', userId: 'user123' }
      ];

      const aiResponse = {
        action: 'create_task',
        taskData: {
          title: 'New Task',
          start_date: '2024-01-15T09:00:00Z',
          category: 'Work',
          priority: 'Medium'
        },
        message: 'Task created successfully',
        suggestions: ['Add reminder', 'Set deadline']
      };

      const createdTask = {
        id: 2,
        title: 'New Task',
        userId: 'user123',
        start_date: '2024-01-15T09:00:00Z',
        category: 'Work',
        priority: 'Medium'
      };

      mockTaskService.getAllTasks.mockResolvedValue(existingTasks);
      mockAIService.parseUserInput.mockResolvedValue(aiResponse);
      mockTaskService.createTask.mockResolvedValue({
        hasConflicts: false,
        task: createdTask
      });
      mockConversationService.saveConversation.mockResolvedValue();

      const response = await request(app)
        .post('/api/chat')
        .send(validRequestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Message processed successfully');
      expect(response.body.data.action).toBe('create_task');
      expect(response.body.data.taskTreated).toEqual(createdTask);

      // Verify service calls
      expect(mockTaskService.getAllTasks).toHaveBeenCalledWith('user123');
      expect(mockAIService.parseUserInput).toHaveBeenCalledWith(validRequestBody.message, existingTasks);
      expect(mockTaskService.createTask).toHaveBeenCalledWith({
        ...aiResponse.taskData,
        userId: 'user123'
      });
      expect(mockConversationService.saveConversation).toHaveBeenCalledTimes(2);
    });

    it('should handle task creation with conflicts', async () => {
      const existingTasks = [
        { id: 1, title: 'Existing Task', start_date: '2024-01-15T09:00:00Z' }
      ];

      const aiResponse = {
        action: 'create_task',
        taskData: {
          title: 'Conflicting Task',
          start_date: '2024-01-15T09:00:00Z',
          duration: 60
        },
        message: 'Task creation requested',
        suggestions: []
      };

      const conflictResult = {
        hasConflicts: true,
        conflicts: [{ id: 1, title: 'Existing Task' }],
        proposedTask: {
          title: 'Conflicting Task',
          start_date: '2024-01-15T09:00:00Z',
          duration: 60
        }
      };

      const alternativeTimes = [
        { description: 'Try 10:00 AM instead', time: '2024-01-15T10:00:00Z' },
        { description: 'Try 2:00 PM instead', time: '2024-01-15T14:00:00Z' }
      ];

      mockTaskService.getAllTasks.mockResolvedValue(existingTasks);
      mockAIService.parseUserInput.mockResolvedValue(aiResponse);
      mockTaskService.createTask.mockResolvedValue(conflictResult);
      mockConflictService.suggestAlternativeTimes.mockReturnValue(alternativeTimes);
      mockConversationService.saveConversation.mockResolvedValue();

      const response = await request(app)
        .post('/api/chat')
        .send(validRequestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.action).toBe('conflict_resolution');
      expect(response.body.data.conflicts).toEqual(conflictResult.conflicts);
      expect(response.body.data.proposedTask).toEqual(conflictResult.proposedTask);
      expect(response.body.data.suggestions).toEqual(['Try 10:00 AM instead', 'Try 2:00 PM instead']);
      expect(response.body.data.message).toContain('scheduling conflict');

      expect(mockConflictService.suggestAlternativeTimes).toHaveBeenCalledWith(
        conflictResult.proposedTask.start_date,
        conflictResult.proposedTask.duration,
        existingTasks
      );
    });

    it('should handle task update successfully', async () => {
      const aiResponse = {
        action: 'update_task',
        task_id: 'task123',
        taskData: {
          title: 'Updated Task Title',
          priority: 'High'
        },
        message: 'Task updated successfully',
        suggestions: []
      };

      const existingTask = {
        id: 'task123',
        title: 'Original Task',
        userId: 'user123'
      };

      const updatedTask = {
        id: 'task123',
        title: 'Updated Task Title',
        priority: 'High',
        userId: 'user123'
      };

      mockTaskService.getAllTasks.mockResolvedValue([existingTask]);
      mockAIService.parseUserInput.mockResolvedValue(aiResponse);
      mockTaskService.findTaskByIdentifier.mockResolvedValue(existingTask);
      mockTaskService.updateTask.mockResolvedValue(updatedTask);
      mockConversationService.saveConversation.mockResolvedValue();

      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Update task to high priority',
          userId: 'user123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.action).toBe('update_task');
      expect(response.body.data.taskUpdated).toEqual(updatedTask);

      expect(mockTaskService.findTaskByIdentifier).toHaveBeenCalledWith('user123', 'task123');
      expect(mockTaskService.updateTask).toHaveBeenCalledWith('user123', 'task123', aiResponse.taskData);
    });

    it('should handle task update when task not found', async () => {
      const aiResponse = {
        action: 'update_task',
        task_id: 'nonexistent',
        taskData: { title: 'Updated' },
        message: 'Task update requested',
        suggestions: []
      };

      mockTaskService.getAllTasks.mockResolvedValue([]);
      mockAIService.parseUserInput.mockResolvedValue(aiResponse);
      mockTaskService.findTaskByIdentifier.mockResolvedValue(null);
      mockConversationService.saveConversation.mockResolvedValue();

      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Update nonexistent task',
          userId: 'user123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('couldn\'t find the task');
      expect(mockTaskService.updateTask).not.toHaveBeenCalled();
    });

    it('should handle query action', async () => {
      const aiResponse = {
        action: 'query',
        message: 'Here are your tasks for today',
        suggestions: ['Add new task', 'Mark task complete']
      };

      mockTaskService.getAllTasks.mockResolvedValue([]);
      mockAIService.parseUserInput.mockResolvedValue(aiResponse);
      mockConversationService.saveConversation.mockResolvedValue();

      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Show my tasks',
          userId: 'user123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.action).toBe('query');
      expect(response.body.data.message).toBe('Here are your tasks for today');
    });

    it('should use default userId when not provided', async () => {
      const aiResponse = {
        action: 'query',
        message: 'Query processed',
        suggestions: []
      };

      mockTaskService.getAllTasks.mockResolvedValue([]);
      mockAIService.parseUserInput.mockResolvedValue(aiResponse);
      mockConversationService.saveConversation.mockResolvedValue();

      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Test message' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockTaskService.getAllTasks).toHaveBeenCalledWith('default');
      expect(mockConversationService.saveConversation).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'default' })
      );
    });

    it('should return 400 for empty message', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: '', userId: 'user123' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Message is required');
    });

    it('should return 400 for whitespace-only message', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: '   ', userId: 'user123' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Message is required');
    });

    it('should return 400 for missing message', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ userId: 'user123' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Message is required');
    });

    it('should handle AI service errors', async () => {
      mockTaskService.getAllTasks.mockResolvedValue([]);
      mockAIService.parseUserInput.mockRejectedValue(new Error('AI service error'));

      const response = await request(app)
        .post('/api/chat')
        .send(validRequestBody)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to process message');
    });

    it('should handle task service errors', async () => {
      mockTaskService.getAllTasks.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/chat')
        .send(validRequestBody)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to process message');
    });

    it('should handle conversation service errors', async () => {
      mockTaskService.getAllTasks.mockResolvedValue([]);
      mockAIService.parseUserInput.mockResolvedValue({
        action: 'query',
        message: 'Test',
        suggestions: []
      });
      mockConversationService.saveConversation.mockRejectedValue(new Error('Conversation save error'));

      const response = await request(app)
        .post('/api/chat')
        .send(validRequestBody)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to process message');
    });

    it('should save both user and assistant messages', async () => {
      const aiResponse = {
        action: 'query',
        message: 'Assistant response',
        suggestions: []
      };

      mockTaskService.getAllTasks.mockResolvedValue([]);
      mockAIService.parseUserInput.mockResolvedValue(aiResponse);
      mockConversationService.saveConversation.mockResolvedValue();

      await request(app)
        .post('/api/chat')
        .send(validRequestBody)
        .expect(200);

      expect(mockConversationService.saveConversation).toHaveBeenCalledTimes(2);
      
      // Check user message save
      expect(mockConversationService.saveConversation).toHaveBeenNthCalledWith(1, {
        userId: 'user123',
        message: 'Create a task for tomorrow at 9 AM',
        type: 'user'
      });

      // Check assistant message save
      expect(mockConversationService.saveConversation).toHaveBeenNthCalledWith(2, {
        userId: 'user123',
        message: 'Assistant response',
        type: 'assistant',
        data: aiResponse
      });
    });
  });

  describe('POST /api/chat/resolve-conflict', () => {
    it('should resolve conflict successfully', async () => {
      const response = await request(app)
        .post('/api/chat/resolve-conflict')
        .send({
          action: 'accept_suggestion',
          taskId: 'task123',
          newTime: '2024-01-15T10:00:00Z',
          userId: 'user123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Data retrieved successfully');
      expect(response.body.data.message).toBe('Conflict resolved successfully');
      expect(response.body.data.action).toBe('accept_suggestion');
    });

    it('should handle conflict resolution with minimal data', async () => {
      const response = await request(app)
        .post('/api/chat/resolve-conflict')
        .send({ action: 'reject' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.action).toBe('reject');
    });

    it('should handle conflict resolution errors', async () => {
      // Mock console.error to avoid test output pollution
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Force an error by making the route handler throw
      jest.spyOn(JSON, 'stringify').mockImplementationOnce(() => {
        throw new Error('JSON error');
      });

      const response = await request(app)
        .post('/api/chat/resolve-conflict')
        .send({ action: 'test' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to resolve conflict');
      
      consoleSpy.mockRestore();
      JSON.stringify.mockRestore();
    });

    it('should handle missing action field', async () => {
      const response = await request(app)
        .post('/api/chat/resolve-conflict')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.action).toBeUndefined();
    });
  });

  describe('Middleware Integration', () => {
    it('should call validation middleware for main chat endpoint', async () => {
      mockTaskService.getAllTasks.mockResolvedValue([]);
      mockAIService.parseUserInput.mockResolvedValue({
        action: 'query',
        message: 'Test',
        suggestions: []
      });
      mockConversationService.saveConversation.mockResolvedValue();

      await request(app)
        .post('/api/chat')
        .send(validRequestBody)
        .expect(200);

      expect(validateChatMessage).toHaveBeenCalled();
    });

    it('should handle validation middleware errors', async () => {
      validateChatMessage.mockImplementation((req, res, next) => {
        res.status(400).json({ success: false, message: 'Validation failed' });
      });

      const response = await request(app)
        .post('/api/chat')
        .send(validRequestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('Error Handling', () => {
    it('should log errors to console', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const testError = new Error('Test error');

      mockTaskService.getAllTasks.mockRejectedValue(testError);

      await request(app)
        .post('/api/chat')
        .send(validRequestBody)
        .expect(500);

      expect(consoleSpy).toHaveBeenCalledWith('Chat processing error:', testError);
      
      consoleSpy.mockRestore();
    });

    it('should include error details in response', async () => {
      const testError = new Error('Specific error message');
      mockTaskService.getAllTasks.mockRejectedValue(testError);

      const response = await request(app)
        .post('/api/chat')
        .send(validRequestBody)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to process message');
      expect(response.body.error).toBe('Specific error message');
    });
  });
});
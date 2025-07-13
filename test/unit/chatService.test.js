import AIService from '../../src/services/aiService.js';
import geminiClient from '../../src/config/gemini.js';

// Mock the gemini client
jest.mock('../src/config/gemini.js', () => ({
  getModel: jest.fn()
}));

describe('AIService', () => {
  let aiService;
  let mockModel;
  let mockChat;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create mock chat object
    mockChat = {
      sendMessage: jest.fn()
    };

    // Create mock model object
    mockModel = {
      startChat: jest.fn().mockReturnValue(mockChat)
    };

    // Mock geminiClient.getModel to return our mock model
    geminiClient.getModel.mockReturnValue(mockModel);

    // Create new AIService instance
    aiService = new AIService();
  });

  describe('constructor', () => {
    it('should initialize with correct system prompt', () => {
      expect(aiService.systemPrompt).toContain('You are an intelligent task management assistant');
      expect(aiService.systemPrompt).toContain('Current date:');
      expect(aiService.systemPrompt)
      .toContain('Categories: Personal, Work, Health, Education, Shopping, Travel, Entertainment');
      expect(aiService.systemPrompt).toContain('Priorities: Low, Medium, High, Urgent');
    });

    it('should include current date in system prompt', () => {
      const currentDate = new Date().toISOString();
      const datePrefix = currentDate.substring(0, 10); // Just the date part
      expect(aiService.systemPrompt).toContain(datePrefix);
    });
  });

  describe('parseUserInput', () => {
    it('should successfully parse valid JSON response', async () => {
      const mockResponse = {
        action: 'create_task',
        taskData: {
          title: 'Test Task',
          category: 'Personal',
          priority: 'Medium'
        },
        message: 'Task created successfully',
        suggestions: ['Add due date', 'Set reminder']
      };

      mockChat.sendMessage.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockResponse)
        }
      });

      const result = await aiService.parseUserInput('Create a test task');

      expect(result).toEqual(mockResponse);
      expect(geminiClient.getModel).toHaveBeenCalledTimes(1);
      expect(mockModel.startChat).toHaveBeenCalledWith({
        history: [],
        generationConfig: { temperature: 0.7 }
      });
    });

    it('should handle JSON response wrapped in code blocks', async () => {
      const mockResponse = {
        action: 'create_task',
        taskData: { title: 'Test Task' },
        message: 'Task created',
        suggestions: []
      };

      mockChat.sendMessage.mockResolvedValue({
        response: {
          text: () => `\`\`\`json\n${JSON.stringify(mockResponse)}\n\`\`\``
        }
      });

      const result = await aiService.parseUserInput('Create a test task');

      expect(result).toEqual(mockResponse);
    });

    it('should handle JSON response wrapped in plain code blocks', async () => {
      const mockResponse = {
        action: 'update_task',
        message: 'Task updated',
        suggestions: []
      };

      mockChat.sendMessage.mockResolvedValue({
        response: {
          text: () => `\`\`\`\n${JSON.stringify(mockResponse)}\n\`\`\``
        }
      });

      const result = await aiService.parseUserInput('Update my task');

      expect(result).toEqual(mockResponse);
    });

    it('should include existing tasks in context when provided', async () => {
      const existingTasks = [
        { id: 1, title: 'Task 1', category: 'Work' },
        { id: 2, title: 'Task 2', category: 'Personal' }
      ];

      const mockResponse = {
        action: 'query',
        message: 'Found existing tasks',
        suggestions: []
      };

      mockChat.sendMessage.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockResponse)
        }
      });

      await aiService.parseUserInput('Show my tasks', existingTasks);

      expect(mockChat.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Existing tasks for context:')
      );
      expect(mockChat.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining(JSON.stringify(existingTasks, null, 2))
      );
    });

    it('should limit existing tasks context to last 5 tasks', async () => {
      const existingTasks = [
        { id: 1, title: 'Task 1' },
        { id: 2, title: 'Task 2' },
        { id: 3, title: 'Task 3' },
        { id: 4, title: 'Task 4' },
        { id: 5, title: 'Task 5' },
        { id: 6, title: 'Task 6' },
        { id: 7, title: 'Task 7' }
      ];

      const mockResponse = {
        action: 'query',
        message: 'Found tasks',
        suggestions: []
      };

      mockChat.sendMessage.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockResponse)
        }
      });

      await aiService.parseUserInput('Show tasks', existingTasks);

      const calledWith = mockChat.sendMessage.mock.calls[0][0];
      expect(calledWith).toContain('Task 3');
      expect(calledWith).toContain('Task 7');
      expect(calledWith).not.toContain('Task 1');
      expect(calledWith).not.toContain('Task 2');
    });

    it('should not include task context when no existing tasks provided', async () => {
      const mockResponse = {
        action: 'create_task',
        message: 'New task created',
        suggestions: []
      };

      mockChat.sendMessage.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockResponse)
        }
      });

      await aiService.parseUserInput('Create new task');

      const calledWith = mockChat.sendMessage.mock.calls[0][0];
      expect(calledWith).not.toContain('Existing tasks for context:');
    });

    it('should handle Gemini API errors gracefully', async () => {
      mockChat.sendMessage.mockRejectedValue(new Error('API Error'));

      const result = await aiService.parseUserInput('Create a task');

      expect(result).toEqual({
        action: 'error',
        message: 'I\'m having trouble processing your request. Could you try rephrasing it?',
        suggestions: ['Try being more specific about the task', 'Include date and time details']
      });
    });

    it('should handle invalid JSON response', async () => {
      mockChat.sendMessage.mockResolvedValue({
        response: {
          text: () => 'Invalid JSON response'
        }
      });

      const result = await aiService.parseUserInput('Create a task');

      expect(result).toEqual({
        action: 'error',
        message: 'I\'m having trouble processing your request. Could you try rephrasing it?',
        suggestions: ['Try being more specific about the task', 'Include date and time details']
      });
    });

    it('should handle network errors', async () => {
      geminiClient.getModel.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await aiService.parseUserInput('Create a task');

      expect(result).toEqual({
        action: 'error',
        message: 'I\'m having trouble processing your request. Could you try rephrasing it?',
        suggestions: ['Try being more specific about the task', 'Include date and time details']
      });
    });

    it('should include user message in the prompt', async () => {
      const userMessage = 'Schedule a meeting for tomorrow at 3 PM';
      const mockResponse = {
        action: 'create_task',
        message: 'Meeting scheduled',
        suggestions: []
      };

      mockChat.sendMessage.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockResponse)
        }
      });

      await aiService.parseUserInput(userMessage);

      expect(mockChat.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining(`User: ${userMessage}`)
      );
    });

    it('should handle different action types', async () => {
      const testCases = [
        { action: 'create_task', taskData: { title: 'New Task' } },
        { action: 'update_task', taskData: { id: 1, title: 'Updated Task' } },
        { action: 'query', message: 'Query result' },
        { action: 'conflict_resolution', conflicts: [{ id: 1, title: 'Conflict' }] }
      ];

      for (const testCase of testCases) {
        const mockResponse = {
          ...testCase,
          message: 'Test message',
          suggestions: []
        };

        mockChat.sendMessage.mockResolvedValue({
          response: {
            text: () => JSON.stringify(mockResponse)
          }
        });

        const result = await aiService.parseUserInput('Test input');
        expect(result.action).toBe(testCase.action);
      }
    });

    it('should log errors to console', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Test error');
      
      mockChat.sendMessage.mockRejectedValue(error);

      await aiService.parseUserInput('Create a task');

      expect(consoleSpy).toHaveBeenCalledWith('AI Service Error:', error);
      
      consoleSpy.mockRestore();
    });
  });

  describe('system prompt validation', () => {
    it('should contain all required action types', () => {
      const requiredActions = ['create_task', 'update_task', 'query', 'conflict_resolution'];
      requiredActions.forEach(action => {
        expect(aiService.systemPrompt).toContain(action);
      });
    });

    it('should contain all required response fields', () => {
      const requiredFields = ['action', 'taskData', 'message', 'suggestions', 'conflicts'];
      requiredFields.forEach(field => {
        expect(aiService.systemPrompt).toContain(field);
      });
    });

    it('should contain date parsing examples', () => {
      const dateExamples = ['Monday at 9 PM', 'every Monday', 'Daily', 'Monthly', 'Yearly'];
      dateExamples.forEach(example => {
        expect(aiService.systemPrompt).toContain(example);
      });
    });

    it('should contain all categories', () => {
      const categories = ['Personal', 'Work', 'Health', 'Education', 'Shopping', 'Travel', 'Entertainment'];
      categories.forEach(category => {
        expect(aiService.systemPrompt).toContain(category);
      });
    });

    it('should contain all priorities', () => {
      const priorities = ['Low', 'Medium', 'High', 'Urgent'];
      priorities.forEach(priority => {
        expect(aiService.systemPrompt).toContain(priority);
      });
    });
  });
});
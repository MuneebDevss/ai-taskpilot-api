import AIService from '../services/aiService.js';
import TaskService from '../services/taskService.js';
import ConversationService from '../services/conversationService.js';
import ConflictService from '../services/conflictService.js';
import { successResponse, errorResponse } from '../utils/responseFormatter.js';
class ChatController {
  constructor() {
    this.aiService = new AIService();
    this.taskService = new TaskService();
    this.conversationService = new ConversationService();
    this.conflictService = new ConflictService();
  }

  async processMessage(req, res) {
    try {
      const { message, userId = 'default', intent, tasks } = req.body;

      if (!message?.trim()) {
        return res.status(400).json(errorResponse('Message is required'));
      }

      if (!intent) {
        return res.status(400).json(errorResponse('Intent is required'));
      }

      // Validate intent values
      const validIntents = ['create_routine', 'improve_routine', 'query'];
      if (!validIntents.includes(intent)) {
        return res.status(400).json(errorResponse(`Invalid intent. Must be one of: ${validIntents.join(', ')}`));
      }

      let aiResponse;

      // Process based on intent
      switch (intent) {
      case 'create_routine':
        aiResponse = await this.aiService.parseUserInput(message, tasks || []);
        break;

      case 'improve_routine':
        aiResponse = await this.aiService.parseUserInput(message, tasks || []);
        break;
      case 'query':
        aiResponse = await this.aiService.planToday(message, tasks || [], userId);
        break;

      default:
        return res.status(400).json(errorResponse('Invalid intent provided'));
      }
      // Check if AI service returned an error
      if (aiResponse.action === 'error') {
        const statusCode = aiResponse.statusCode || 422;
        return res.status(statusCode).json(errorResponse(aiResponse.message, aiResponse.suggestions));
      }

      const suggestions = aiResponse.suggestions || [];

      res.json({
        suggestions,
        ...successResponse(aiResponse.taskData, aiResponse.message)
      });

    } catch (error) {
      console.error('Chat processing error:', error);
      res.status(500).json(errorResponse('Failed to process message', error.message));
    }
  }

  async planTodayWithExistingTasks(req, res) {
    try {
      const { userId = 'default', existingTasks = [], currentTasks } = req.body;

      if (!Array.isArray(existingTasks)) {
        return res.status(400).json(errorResponse('existingTasks must be an array'));
      }
      if (!Array.isArray(currentTasks)) {
        return res.status(400).json(errorResponse('currentTasks must be an array'));
      }

      const aiResponse = await this.aiService.planToday(existingTasks, userId, currentTasks);

      if (aiResponse.action === 'error') {
        const statusCode = aiResponse.statusCode || 422;
        return res.status(statusCode).json(errorResponse(aiResponse.message, aiResponse.suggestions));
      }

      const suggestions = aiResponse.suggestions || [];
      res.json({
        suggestions,
        ...successResponse(aiResponse.taskData, aiResponse.message)
      });
    } catch (error) {
      console.error('PlanTodayWithExistingTasks error:', error);
      res.status(500).json(errorResponse('Failed to process plan today with existing tasks', error.message));
    }
  }

  // Helper method to sanitize data for Firestore
  async resolveConflict(req, res) {
    try {
      // const { action, taskId, newTime, userId = 'default' } = req.body;
      const { action } = req.body;

      // Implementation depends on the specific conflict resolution logic
      // This is a placeholder for the actual implementation

      res.json(successResponse({
        message: 'Conflict resolved successfully',
        action: action
      }));
    } catch (error) {
      console.error('Conflict resolution error:', error);
      res.status(500).json(errorResponse('Failed to resolve conflict', error.message));
    }
  }
}
export default ChatController;

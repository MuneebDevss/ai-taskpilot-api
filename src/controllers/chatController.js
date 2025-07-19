import AIService from '../services/aiService.js';
import TaskService from '../services/taskService.js';
import ConversationService from '../services/conversationService.js';
import ConflictService from '../services/conflictService.js';
import Task from '../models/Task.js';
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
      const { message, userId = 'default' } = req.body;

      if (!message?.trim()) {
        return res.status(400).json(errorResponse('Message is required'));
      }

      // Save user message
      await this.conversationService.saveConversation({
        userId,
        message,
        type: 'user'
      });

      // Get existing tasks for context

      // Process with AI
      const aiResponse = await this.aiService.parseUserInput(message, []);
      const responseData = { ...aiResponse.taskData };

      // Convert any Task instances to plain objects before saving
      const sanitizedResponseData = this.sanitizeForFirestore(responseData);

      // Save assistant response
      await this.conversationService.saveConversation({
        userId,
        message: aiResponse.message,
        type: 'assistant',
        data: responseData.taskData
      });
      const suggestions = aiResponse.suggestions;
      const action = aiResponse.action;
      res.json( { suggestions, action,...successResponse(sanitizedResponseData, aiResponse.message) } );

    } catch (error) {
      console.error('Chat processing error:', error);
      res.status(500).json(errorResponse('Failed to process message', error.message));
    }
  }

  // Helper method to sanitize data for Firestore
  sanitizeForFirestore(data) {
    if (data instanceof Task) {
      return data.toJSON();
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeForFirestore(item));
    }

    if (data && typeof data === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeForFirestore(value);
      }
      return sanitized;
    }

    return data;
  }

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

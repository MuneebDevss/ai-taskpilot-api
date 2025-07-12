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
      const existingTasks = await this.taskService.getAllTasks(userId);

      // Process with AI
      const aiResponse = await this.aiService.parseUserInput(message, existingTasks);
      let responseData = { ...aiResponse };

      // Handle different actions
      if (aiResponse.action === 'create_task' && aiResponse.task_data) {
        const result = await this.taskService.createTask({
          ...aiResponse.task_data,
          userId
        });

        if (result.hasConflicts) {
          const suggestions = this.conflictService.suggestAlternativeTimes(
            result.proposedTask.start_date,
            result.proposedTask.duration,
            existingTasks
          );

          responseData = {
            action: 'conflict_resolution',
            message: `I found a scheduling conflict! You have "${result.conflicts[0].title}" at 
            that time. Would you like me to suggest alternative times?`,
            conflicts: result.conflicts,
            proposedTask: result.proposedTask,
            suggestions: suggestions.map(s => s.description)
          };
        } else {
          responseData.taskTreated = result.task;
        }
      }

      if (aiResponse.action === 'update_task') {
        const task = await this.taskService.findTaskByIdentifier(
          userId,
          aiResponse.task_id || aiResponse.task_identifier
        );

        if (task) {
          const updatedTask = await this.taskService.updateTask(
            userId,
            task.id,
            aiResponse.task_data
          );
          responseData.taskUpdated = updatedTask;
        } else {
          responseData.message = 'I couldn\'t find the task you\'re referring to. Could you be more specific?';
        }
      }

      // Save assistant response
      await this.conversationService.saveConversation({
        userId,
        message: responseData.message,
        type: 'assistant',
        data: responseData
      });

      res.json(successResponse(responseData, 'Message processed successfully'));

    } catch (error) {
      console.error('Chat processing error:', error);
      res.status(500).json(errorResponse('Failed to process message', error.message));
    }
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

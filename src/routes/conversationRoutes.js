import express from 'express';
import ConversationService from '../services/conversationService.js';
import { validateUserId } from '../middleware/validation.js';
import { successResponse, errorResponse } from '../utils/responseFormatter.js';

const router = express.Router();
const conversationService = new ConversationService();

// GET /api/conversations - Get conversation history
router.get('/', validateUserId, async (req, res) => {
  try {
    const { userId = 'default' } = req.query;
    const conversations = await conversationService.getConversationHistory(userId);

    res.json(successResponse(conversations, 'Conversations retrieved successfully'));
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json(errorResponse('Failed to retrieve conversations', error.message));
  }
});

export default router;

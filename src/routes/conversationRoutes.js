const express = require('express');
const ConversationService = require('../services/conversationService');
const { validateUserId } = require('../middleware/validation');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

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

module.exports = router;
const express = require('express');
const ChatController = require('../controllers/chatController');
const { validateChatMessage } = require('../middleware/validation');

const router = express.Router();
const chatController = new ChatController();

// POST /api/chat - Process chat message
router.post('/', validateChatMessage, chatController.processMessage.bind(chatController));

// POST /api/chat/resolve-conflict - Resolve scheduling conflicts
router.post('/resolve-conflict', chatController.resolveConflict.bind(chatController));

module.exports = router;
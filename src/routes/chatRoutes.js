import express from 'express';
import ChatController from '../controllers/chatController.js';
import { validateChatMessage } from '../middleware/validation.js';

const router = express.Router();
const chatController = new ChatController();

// POST /api/chat - Process chat message
router.post('/', validateChatMessage, chatController.processMessage.bind(chatController));

// POST /api/chat/resolve-conflict - Resolve scheduling conflicts
router.post('/resolve-conflict', chatController.resolveConflict.bind(chatController));

export default router;

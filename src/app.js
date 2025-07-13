import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import taskRoutes from './routes/taskRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';

import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { optionalAuth } from './middleware/authentication.js';
import config from './config/environment.js';
import logger from './utils/logger.js';
import GeminiClient from './config/gemini.js';
import Database from './config/database.js';
const geminiClient = GeminiClient.getInstance();
const database = Database.getInstance();
class App {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    }));

    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use('/api/', limiter);

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    this.app.use(compression());
    this.app.use(optionalAuth);

    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id || req.query.userId || 'anonymous'
      });
      next();
    });
  }

  setupRoutes() {
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: config.nodeEnv
      });
    });

    this.app.use('/api/tasks', taskRoutes);
    this.app.use('/api/chat', chatRoutes);
    this.app.use('/api/conversations', conversationRoutes);

    this.app.get('/api', (req, res) => {
      res.json({
        name: 'AI Task Manager API',
        version: '1.0.0',
        endpoints: {
          'GET /health': 'Health check',
          'GET /api/tasks': 'Get all tasks',
          'GET /api/tasks/:id': 'Get task by ID',
          'PUT /api/tasks/:id': 'Update task',
          'DELETE /api/tasks/:id': 'Delete task',
          'POST /api/chat': 'Process chat message',
          'POST /api/chat/resolve-conflict': 'Resolve scheduling conflict',
          'GET /api/conversations': 'Get conversation history'
        }
      });
    });
  }

  setupErrorHandling() {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  async initialize() {
    try {
      await database.initialize();
      geminiClient.initialize();
      logger.info('Application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application:', error);
      process.exit(1);
    }
  }

  getExpressApp() {
    return this.app;
  }
}

export default App;

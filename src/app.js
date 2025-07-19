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

class App {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Trust proxy for serverless environments (Vercel, AWS Lambda, etc.)
    this.app.set('trust proxy', true);
    this.app.use(helmet({
      contentSecurityPolicy: false// Disable CSP for serverless
    }));
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    }));

    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
      // Custom key generator for serverless environments
      keyGenerator: (req) => {
        // Try multiple sources for IP address
        return req.ip ||
               req.connection?.remoteAddress ||
               req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.headers['x-real-ip'] ||
               'unknown';
      },
      // Skip rate limiting in development or if IP can't be determined
      skip: (req) => {
        const ip = req.ip || req.connection?.remoteAddress;
        return !ip || ip === '::1' || ip === '127.0.0.1' || process.env.NODE_ENV === 'development';
      }
    });
    // this.app.use('/api/', limiter);

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

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
        environment: config.nodeEnv,
        initialized: true
      });
    });

    this.app.use('/tasks', taskRoutes);
    this.app.use('/chat', chatRoutes);
    this.app.use('/conversations', conversationRoutes);

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
      logger.info('🔄 Starting application initialization...');
      // Add timeout wrapper
      const withTimeout = (promise, timeoutMs, name) => {
        return Promise.race([
          promise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${name} timeout after ${timeoutMs}ms`)), timeoutMs)
          )
        ]);
      };

      // Initialize database with timeout
      const database = Database.getInstance();
      await withTimeout(
        database.initialize(),
        15000,
        'Database initialization'
      );
      logger.info('✅ Database initialized');

      // Initialize Gemini client with timeout
      const geminiClient = GeminiClient.getInstance();
      await withTimeout(
        Promise.resolve(geminiClient.initialize()),
        10000,
        'Gemini client initialization'
      );
      logger.info('✅ Gemini client initialized');

      logger.info('✅ Application initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize application:', error);
      // In serverless, don't exit the process - just throw the error
      throw error;
    }
  }

  getExpressApp() {
    return this.app;
  }
}

export default App;

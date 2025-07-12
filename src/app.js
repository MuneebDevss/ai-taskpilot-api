const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Import routes
const taskRoutes = require('./routes/taskRoutes');
const chatRoutes = require('./routes/chatRoutes');
const conversationRoutes = require('./routes/conversationRoutes');

// Import middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { optionalAuth } = require('./middleware/authentication');

// Import configurations
const database = require('./config/database');
const geminiClient = require('./config/gemini');
const config = require('./config/environment');
const logger = require('./utils/logger');

class App {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression
    this.app.use(compression());

    // Optional authentication
    this.app.use(optionalAuth);

    // Request logging
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
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: config.nodeEnv
      });
    });

    // API routes
    this.app.use('/api/tasks', taskRoutes);
    this.app.use('/api/chat', chatRoutes);
    this.app.use('/api/conversations', conversationRoutes);

    // API documentation
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
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  async initialize() {
    try {
      // Initialize database
      await database.initialize();
      
      // Initialize Gemini client
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

module.exports = App;

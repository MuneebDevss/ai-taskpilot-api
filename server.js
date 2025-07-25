import App from './src/app.js';
import logger from './src/utils/logger.js';
import config from './src/config/environment.js';

async function startServer() {
  try {
    const app = new App();
    await app.initialize();

    const expressApp = app.getExpressApp();

    const server = expressApp.listen(config.port, () => {
      logger.info(`🚀 AI Task Manager API running on port ${config.port}`);
      logger.info(`📝 Environment: ${config.nodeEnv}`);
      logger.info(`📋 API Documentation: http://localhost:${config.port}/api`);
      logger.info(`🏥 Health Check: http://localhost:${config.port}/health`);
    });

    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();

import App from './src/app.js';
import logger from './src/utils/logger.js';
import config from './src/config/environment.js';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    const app = new App();
    await app.initialize();
    const expressApp = app.getExpressApp();

    expressApp.listen(PORT, () => {
      logger.info('🚀 AI Task Manager API ready');
      logger.info(`📝 Environment: ${config.nodeEnv}`);
      logger.info(`🌐 Server running on http://localhost:${PORT}`);
      logger.info('📋 API Documentation: /api');
      logger.info('🏥 Health Check: /health');
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 
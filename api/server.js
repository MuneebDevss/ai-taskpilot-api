import App from '../src/app.js';
import logger from '../src/utils/logger.js';
import config from '../src/config/environment.js';
import serverless from 'serverless-http';

let serverlessHandler;

async function setup() {
  try {
    const app = new App();
    await app.initialize();
    const expressApp = app.getExpressApp();

    logger.info('🚀 AI Task Manager API ready');
    logger.info(`📝 Environment: ${config.nodeEnv}`);
    logger.info('📋 API Documentation: /api');
    logger.info('🏥 Health Check: /health');

    // Prepare serverless handler once app is ready
    serverlessHandler = serverless(expressApp);
  } catch (error) {
    logger.error('Failed to initialize server:', error);
    throw error;
  }
}

// Run setup on cold start
await setup();

// Exported Lambda/Vercel handler
export const handler = async (event, context) => {
  if (!serverlessHandler) {
    await setup(); // fallback for unexpected hot-start failures
  }
  return serverlessHandler(event, context);
};

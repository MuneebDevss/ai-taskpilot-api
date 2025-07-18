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

    // Vercel will use this handler
    serverlessHandler = serverless(expressApp);
  } catch (error) {
    logger.error('Failed to initialize server:', error);
    throw error;
  }
}

// Run setup immediately
await setup();

export const handler = async (event, context) => {
  if (!serverlessHandler) {
    await setup(); // fallback in case handler wasn't initialized
  }
  return serverlessHandler(event, context);
};

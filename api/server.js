//api/server.js
import App from '../src/app.js';
import logger from '../src/utils/logger.js';
import config from '../src/config/environment.js';
import serverless from 'serverless-http';

let serverlessHandler;
let isInitialized = false;
let initializationPromise = null;

async function setup() {
  // Prevent multiple initializations
  if (isInitialized) {
    return serverlessHandler;
  }
  
  // If already initializing, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      logger.info('🔄 Initializing serverless function...');
      
      const app = new App();
      await app.initialize();
      const expressApp = app.getExpressApp();

      logger.info('🚀 AI Task Manager API ready');
      logger.info(`📝 Environment: ${config.nodeEnv}`);
      logger.info('📋 API Documentation: /api');
      logger.info('🏥 Health Check: /health');

      // Prepare serverless handler once app is ready
      serverlessHandler = serverless(expressApp);
      isInitialized = true;
      
      return serverlessHandler;
    } catch (error) {
      logger.error('❌ Failed to initialize server:', error);
      // Reset state on failure
      isInitialized = false;
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
}

// Exported Lambda/Vercel handler
export const handler = async (event, context) => {
  try {
    // Ensure initialization is complete
    if (!isInitialized) {
      await setup();
    }
    
    return await serverlessHandler(event, context);
  } catch (error) {
    logger.error('❌ Handler error:', error);
    
    // Return proper HTTP error response
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      })
    };
  }
};

// For local development
export default handler;
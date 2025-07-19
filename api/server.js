//api/server.js
import App from '../src/app.js';
import logger from '../src/utils/logger.js';
import config from '../src/config/environment.js';
import serverless from 'serverless-http';

let serverlessHandler;
let isInitialized = false;
let initializationPromise = null;

// Add timeout wrapper for any async operation
const withTimeout = (promise, timeoutMs, operation = 'Operation') => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${operation} timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

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
      // Add timeout to initialization - most serverless platforms have 30s limit
      await withTimeout(app.initialize(), 25000, 'App initialization');
      const expressApp = app.getExpressApp();

      logger.info('🚀 AI Task Manager API ready');
      logger.info(`📝 Environment: ${config.nodeEnv}`);
      logger.info('📋 API Documentation: /api');
      logger.info('🏥 Health Check: /health');

      // Prepare serverless handler once app is ready
      serverlessHandler = serverless(expressApp, {
        // Add serverless-http options for better handling
        request: (request, event, context) => {
          // Set a reasonable timeout
          if (context) {
            context.callbackWaitsForEmptyEventLoop = false;
          }
        }
      });
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
  // Prevent Lambda from waiting for empty event loop
  if (context) {
    context.callbackWaitsForEmptyEventLoop = false;
  }
  try {
    // Ensure initialization is complete
    const handlerFn = await withTimeout(setup(), 25000, 'Server setup');

    // Execute the request with timeout
    console.log('About to call serverless handler...');
    const result = await withTimeout(
      handlerFn(event, context),
      25000,
      'Request processing'
    );
    console.log('Serverless handler result:', JSON.stringify(result, null, 2));
    console.log('Result type:', typeof result);
    console.log('Result keys:', Object.keys(result || {}));
    
    return result;
  } catch (error) {
    logger.error('❌ Handler error:', error);

    // Return proper HTTP error response
    return {
      statusCode: error.message.includes('timeout') ? 504 : 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: JSON.stringify({
        error: error.message.includes('timeout') ? 'Gateway Timeout' : 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
        timestamp: new Date().toISOString()
      })
    };
  }
};

// For local development with Vercel CLI
export default async (req, res) => {
  // Convert Vercel request/response to Lambda-like event/context
  
  const event = {
    httpMethod: req.method,
    path: req.url,
    headers: req.headers,
    body: req.body ? JSON.stringify(req.body) : null,
    queryStringParameters: req.query || {},
    isBase64Encoded: false
  };

  const context = {
    callbackWaitsForEmptyEventLoop: false,
    getRemainingTimeInMillis: () => 30000
  };

  try {
    const result = await handler(event, context);
    // Convert Lambda response back to Vercel response
    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }
    res.status(result.statusCode || 200);
    if (result.body) {
      const body = typeof result.body === 'string' ? result.body : JSON.stringify(result.body);
      res.send(body);
    } else {
      res.end();
    }
  } catch (error) {
    logger.error('❌ Vercel dev handler error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};
const { errorResponse } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    query: req.query
  });

  // Default error
  let statusCode = 500;
  let message = 'Internal Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate resource';
  } else if (err.message.includes('not found')) {
    statusCode = 404;
    message = err.message;
  } else if (err.message.includes('Unauthorized')) {
    statusCode = 401;
    message = 'Unauthorized';
  }

  res.status(statusCode).json(errorResponse(message, process.env.NODE_ENV === 'development' ? err.stack : null));
};

const notFoundHandler = (req, res) => {
  res.status(404).json(errorResponse(`Route ${req.originalUrl} not found`));
};

module.exports = {
  errorHandler,
  notFoundHandler
};
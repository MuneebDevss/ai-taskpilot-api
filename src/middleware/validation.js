const { body, query, param, validationResult } = require('express-validator');
const { errorResponse } = require('../utils/responseFormatter');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(errorResponse('Validation failed', errors.array()));
  }
  next();
};

const validateChatMessage = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  body('userId')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('User ID must be between 1 and 100 characters'),
  handleValidationErrors
];

const validateTaskUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('category')
    .optional()
    .isIn(['Personal', 'Work', 'Health', 'Education', 'Shopping', 'Travel', 'Entertainment'])
    .withMessage('Invalid category'),
  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High', 'Urgent'])
    .withMessage('Invalid priority'),
  body('status')
    .optional()
    .isIn(['Pending', 'In Progress', 'Completed', 'Cancelled'])
    .withMessage('Invalid status'),
  handleValidationErrors
];

const validateUserId = [
  query('userId')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('User ID must be between 1 and 100 characters'),
  handleValidationErrors
];

const validateTaskId = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Task ID is required'),
  handleValidationErrors
];

module.exports = {
  validateChatMessage,
  validateTaskUpdate,
  validateUserId,
  validateTaskId,
  handleValidationErrors
};
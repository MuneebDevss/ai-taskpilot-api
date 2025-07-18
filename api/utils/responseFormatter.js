export const successResponse = (data, message = 'Success') => ({
  success: true,
  message,
  data,
  timestamp: new Date().toISOString()
});

export const errorResponse = (message, details = null) => ({
  success: false,
  message,
  details,
  timestamp: new Date().toISOString()
});

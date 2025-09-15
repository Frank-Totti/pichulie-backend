/**
 * Global error handling middleware
 *
 * Handles all unhandled errors in the application, logging useful details in 
 * development mode and restricting output in production. Differentiates between 
 * server-side (5xx) and client-side (4xx) errors to send appropriate responses.
 *
 * Error handling flow:
 * 1. Logs detailed error information only in development mode
 * 2. Logs minimal info in production (URL of the failing request)
 * 3. Determines HTTP status code (defaults to 500 if not provided)
 * 4. Sends JSON response with error details, message, and timestamp
 *
 * @function globalErrorHandler
 * @param {Error} err - The error object caught by Express
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 *
 * @example
 * // Usage in Express app
 * const { globalErrorHandler } = require('./middlewares/errorHandler');
 * app.use(globalErrorHandler);
 */
const globalErrorHandler = (err, req, res, next) => {
  // Log error details only in development mode
  if (process.env.NODE_ENV === 'development') {
    console.error('Unhandled error:', err);
    console.error('Stack trace:', err.stack);
    console.error('Request URL:', req.originalUrl);
    console.error('Request method:', req.method);
    console.error('Request body:', req.body);
  } else {
    // In production, log only essential info
    console.error('Unhandled error occurred on:', req.originalUrl);
  }

  // Determine error status
  const statusCode = err.statusCode || err.status || 500;
  
  // Send appropriate response
  if (statusCode >= 500) {
    // Server errors (5xx)
    res.status(statusCode).json({
      success: false,
      message: 'Try again later',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      timestamp: new Date().toISOString(),
      path: req.originalUrl
    });
  } else {
    // Client errors (4xx) - pass through the original message
    res.status(statusCode).json({
      success: false,
      message: err.message || 'Bad request',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      timestamp: new Date().toISOString(),
      path: req.originalUrl
    });
  }
};

// 404 handler for unmatched routes
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'POST /api/users/login',
      'POST /api/users/register',
      'POST /api/users/update',
      'POST /api/users/upload-pfp',
      'POST /api/users/request-reset',
      'GET /api/users/validate-token/:token',
      'POST /api/users/reset-password',
      'POST /api/users/resend-reset'
    ]
  });
};

module.exports = {
  globalErrorHandler,
  notFoundHandler
};

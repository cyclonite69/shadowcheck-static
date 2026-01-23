/**
 * Centralized Express error handler.
 * @param {Error} err - Error thrown by route or middleware
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next
 */
const errorHandler = (err, req, res, next) => {
  const requestId = req.requestId || 'unknown';

  // Only log full error details in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${requestId}] Error details:`, err);
  } else {
    console.error(`[${requestId}] Error:`, err.message);
  }

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Only send stack trace in development
  const errorResponse = {
    error: {
      message,
      requestId,
    },
  };

  if (process.env.NODE_ENV === 'development' && err.stack) {
    errorResponse.error.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;

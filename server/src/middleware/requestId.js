const crypto = require('crypto');

/**
 * Adds a request ID to the request/response cycle for tracing.
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next
 */
function requestIdMiddleware(req, res, next) {
  // Use existing request ID from header or generate new one
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();

  // Attach to request
  req.requestId = requestId;
  req.startTime = Date.now();

  // Add to response headers
  res.setHeader('X-Request-ID', requestId);

  next();
}

module.exports = requestIdMiddleware;

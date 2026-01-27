const authService = require('../services/authService');
const logger = require('../logging/logger');

/**
 * Extract session token from request
 */
function extractToken(req) {
  // Try cookie first (most secure)
  if (req.cookies && req.cookies.session_token) {
    return req.cookies.session_token;
  }

  // Fallback to Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Middleware to require authentication
 */
function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NO_TOKEN',
    });
  }

  authService
    .validateSession(token)
    .then((result) => {
      if (!result.valid) {
        return res.status(401).json({
          error: result.error || 'Invalid session',
          code: 'INVALID_SESSION',
        });
      }

      // Add user to request object
      req.user = result.user;
      next();
    })
    .catch((error) => {
      logger.error('Auth middleware error:', error);
      res.status(500).json({
        error: 'Authentication error',
        code: 'AUTH_ERROR',
      });
    });
}

/**
 * Middleware to require admin role
 */
function requireAdmin(req, res, next) {
  // First check if user is authenticated
  requireAuth(req, res, (err) => {
    if (err) {
      return;
    }

    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    next();
  });
}

/**
 * Optional auth middleware - adds user to request if token is valid
 */
function optionalAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return next();
  }

  authService
    .validateSession(token)
    .then((result) => {
      if (result.valid) {
        req.user = result.user;
      }
      next();
    })
    .catch((error) => {
      logger.error('Optional auth middleware error:', error);
      next(); // Continue without user
    });
}

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth,
  extractToken,
};

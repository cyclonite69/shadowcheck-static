export {};
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authService } = require('../../../config/container');
const { requireAdmin, extractToken } = require('../../../middleware/authMiddleware');
const logger = require('../../../logging/logger');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

const changePasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many password change attempts, please try again after 1 hour',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/auth/login
 * User login
 */
router.post('/auth/login', loginLimiter, async (req: any, res: any) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required',
      });
    }

    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || req.connection.remoteAddress || '';

    const result = await authService.login(username, password, userAgent, ipAddress);

    if (!result.success) {
      return res.status(result.status || 401).json({ error: result.error });
    }

    // Set HTTP-only cookie (most secure)
    res.cookie('session_token', result.token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true', // Require explicit opt-in for HTTPS
      sameSite: 'lax', // Allow cookie on top-level navigation (fixes SPA page-to-page auth)
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.json({
      success: true,
      user: result.user,
      forcePasswordChange: Boolean(result.forcePasswordChange),
      message: 'Login successful',
    });
  } catch (error: any) {
    logger.error('[AUTH ERROR]', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * POST /api/auth/logout
 * User logout
 */
router.post('/auth/logout', (req: any, res: any) => {
  res.clearCookie('session_token');
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/auth/me', extractToken, async (req: any, res: any) => {
  try {
    const token = req.token;
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await authService.verifyToken(token);
    if (!result.success) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({
      success: true,
      user: result.user,
    });
  } catch (error: any) {
    logger.error('Auth me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/auth/change-password', extractToken, changePasswordLimiter, async (req: any, res: any) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const token = req.token;

    if (!token || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const authCheck = await authService.verifyToken(token);
    if (!authCheck.success) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const result = await authService.changePassword(authCheck.user.username, currentPassword, newPassword);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    logger.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/users
 * List all users (admin only)
 */
router.get('/admin/users', extractToken, requireAdmin, async (req: any, res: any) => {
  try {
    const result = await authService.listUsers();
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      users: result.users,
    });
  } catch (error: any) {
    logger.error('List users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/users
 * Create a new user (admin only)
 */
router.post('/admin/users', extractToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await authService.createUser(username, email, password, role);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    logger.info(`User ${username} created by admin ${req.user.username}`);

    res.json({
      success: true,
      user: result.user,
      message: 'User created successfully',
    });
  } catch (error: any) {
    logger.error('Create user route error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

module.exports = router;

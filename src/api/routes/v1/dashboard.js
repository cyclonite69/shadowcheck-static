/**
 * Dashboard routes
 * HTTP endpoints for dashboard operations
 */

const express = require('express');
const router = express.Router();

// This will be injected via dependency injection
let dashboardService;

/**
 * Initialize dashboard routes with dependencies
 * @param {Object} deps - Dependencies
 * @param {DashboardService} deps.dashboardService - Dashboard service instance
 */
function initDashboardRoutes(deps) {
  dashboardService = deps.dashboardService;
  return router;
}

/**
 * GET /api/dashboard-metrics
 * Get dashboard metrics (total networks, threats, etc.)
 */
router.get('/dashboard-metrics', async (req, res) => {
  try {
    const metrics = await dashboardService.getMetrics();

    // Return raw metrics object (legacy format)
    res.json(metrics);
  } catch (err) {
    console.error('Dashboard metrics error:', err);
    res.status(500).json({
      error: 'Failed to fetch dashboard metrics',
      details: err.message,
    });
  }
});

/**
 * GET /api/dashboard-summary
 * Get dashboard summary with additional context
 */
router.get('/dashboard-summary', async (req, res) => {
  try {
    const summary = await dashboardService.getSummary();

    res.json({
      ok: true,
      data: summary,
    });
  } catch (err) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({
      error: 'Failed to fetch dashboard summary',
      details: err.message,
    });
  }
});

module.exports = { router, initDashboardRoutes };

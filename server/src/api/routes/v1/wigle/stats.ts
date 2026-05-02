/**
 * WiGLE Stats API Routes
 */

import express from 'express';
const router = express.Router();
const { wigleService } = require('../../../../config/container');
const logger = require('../../../../logging/logger');

/**
 * GET /api/v1/wigle/user-stats
 * Fetch current user stats and rank from WiGLE
 */
router.get('/user-stats', async (req: any, res: any, next: any) => {
  try {
    const stats = await wigleService.getUserStats();
    logger.info(
      '[WiGLE Stats DEBUG] raw response keys: ' + JSON.stringify(Object.keys(stats || {}))
    );
    logger.info('[WiGLE Stats DEBUG] raw response: ' + JSON.stringify(stats));
    res.json({ success: true, stats });
  } catch (err: any) {
    logger.error(`[WiGLE] Failed to fetch user stats: ${err.message}`);
    const status = err.status ?? (err.message?.includes('not configured') ? 503 : 500);
    res.status(status).json({ success: false, error: err.message });
  }
});

export default router;

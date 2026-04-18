/**
 * WiGLE Status Routes
 * API connectivity checks
 */

import express from 'express';
const router = express.Router();
import secretsManager from '../../../../services/secretsManager';
import { requireAdmin } from '../../../../middleware/authMiddleware';
import { getQuotaStatus } from '../../../../services/wigleRequestLedger';

/**
 * GET /wigle/api-status - Check WiGLE API connectivity
 */
router.get('/api-status', async (req, res) => {
  const wigleApiName = secretsManager.get('wigle_api_name');
  const wigleApiToken = secretsManager.get('wigle_api_token');

  res.json({
    configured: !!(wigleApiName && wigleApiToken),
    hasApiName: !!wigleApiName,
    hasApiToken: !!wigleApiToken,
  });
});

router.get('/quota-status', requireAdmin, async (_req, res) => {
  res.json({
    ok: true,
    quota: getQuotaStatus(),
  });
});

export default router;

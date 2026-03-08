const express = require('express');
const logger = require('../../../../logging/logger');
const { siblingDetectionAdminService } = require('../../../../config/container');

export {};

const router = express.Router();

router.post('/admin/siblings/refresh', async (req, res) => {
  try {
    const { batchSize, maxOctetDelta, maxDistanceM, minCandidateConf, minStrongConf, maxBatches } =
      req.body || {};

    const result = await siblingDetectionAdminService.startSiblingRefresh({
      batchSize,
      maxOctetDelta,
      maxDistanceM,
      minCandidateConf,
      minStrongConf,
      maxBatches,
    });

    res.status(result.accepted ? 202 : 409).json({
      ok: result.accepted,
      message: result.accepted
        ? 'Sibling refresh started in background'
        : 'Sibling refresh already running',
      status: result.status,
    });
  } catch (err: any) {
    logger.error('[Siblings] Failed to start refresh', { error: err?.message });
    res.status(500).json({
      ok: false,
      error: err?.message || 'Failed to start sibling refresh',
    });
  }
});

router.get('/admin/siblings/refresh/status', (req, res) => {
  try {
    const status = siblingDetectionAdminService.getSiblingRefreshStatus();
    res.json({ ok: true, status });
  } catch (err: any) {
    logger.error('[Siblings] Failed to load refresh status', { error: err?.message });
    res.status(500).json({
      ok: false,
      error: err?.message || 'Failed to load sibling refresh status',
    });
  }
});

router.get('/admin/siblings/stats', async (req, res) => {
  try {
    const stats = await siblingDetectionAdminService.getSiblingStats();
    res.json({ ok: true, stats });
  } catch (err: any) {
    logger.error('[Siblings] Failed to load stats', { error: err?.message });
    res.status(500).json({
      ok: false,
      error: err?.message || 'Failed to load sibling stats',
    });
  }
});

module.exports = router;

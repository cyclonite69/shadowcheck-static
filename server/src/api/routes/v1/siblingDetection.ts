/**
 * Sibling Detection Routes — mac_increment and band_pair modalities.
 *
 * These routes trigger additive detection runs that write new candidate pairs
 * to app.network_sibling_pairs alongside existing pairs. They do not modify
 * or delete existing rows.
 */

const express = require('express');
const logger = require('../../../logging/logger');
const { asyncHandler } = require('../../../utils/asyncHandler');
const {
  detectMacIncrement,
  detectBandPair,
  detectXfinitySignature,
  persistSiblingPairs,
} = require('../../../services/siblingDetectionService');
const { adminQuery } = require('../../../services/adminDbService');

export {};

const router = express.Router();

/**
 * POST /api/sibling-detection/run
 *
 * Trigger a detection run for one or both modalities.
 *
 * Body:
 *   modality: 'mac_increment' | 'band_pair' | 'xfinity_sig' | 'all'
 *   limit?:   number  — max seed rows per modality (default 5000)
 *
 * Returns a summary of pairs detected and inserted/updated per modality.
 */
router.post(
  '/sibling-detection/run',
  asyncHandler(async (req: any, res: any) => {
    const modality: string = req.body?.modality || 'all';
    const limit: number = Number(req.body?.limit) || 5000;

    if (!['mac_increment', 'band_pair', 'xfinity_sig', 'all'].includes(modality)) {
      return res.status(400).json({
        ok: false,
        error: 'modality must be one of: mac_increment, band_pair, xfinity_sig, all',
      });
    }

    const results: Record<string, { detected: number; inserted: number; updated: number }> = {};

    if (modality === 'mac_increment' || modality === 'all') {
      logger.info('[SiblingDetection] Starting mac_increment run', { limit });
      const pairs = await detectMacIncrement(limit);
      const summary = await persistSiblingPairs(pairs);
      results.mac_increment = summary;
      logger.info('[SiblingDetection] mac_increment complete', summary);
    }

    if (modality === 'band_pair' || modality === 'all') {
      logger.info('[SiblingDetection] Starting band_pair run', { limit });
      const pairs = await detectBandPair(limit);
      const summary = await persistSiblingPairs(pairs);
      results.band_pair = summary;
      logger.info('[SiblingDetection] band_pair complete', summary);
    }

    if (modality === 'xfinity_sig' || modality === 'all') {
      logger.info('[SiblingDetection] Starting xfinity_sig run', { limit });
      const pairs = await detectXfinitySignature(limit);
      const summary = await persistSiblingPairs(pairs);
      results.xfinity_sig = summary;
      logger.info('[SiblingDetection] xfinity_sig complete', summary);
    }

    res.json({ ok: true, results });
  })
);

/**
 * GET /api/sibling-detection/stats
 *
 * Returns counts by rule, average confidence, and the most recent
 * computed_at timestamp for detection_pipeline_v2 pairs.
 */
router.get(
  '/sibling-detection/stats',
  asyncHandler(async (_req: any, res: any) => {
    const { rows } = await adminQuery(`
      SELECT
        rule,
        COUNT(*)::int                          AS pair_count,
        ROUND(AVG(confidence)::numeric, 3)     AS avg_confidence,
        MAX(computed_at)                       AS last_run_at
      FROM app.network_sibling_pairs
      WHERE source = 'detection_pipeline_v2'
      GROUP BY rule
      ORDER BY pair_count DESC
    `);

    const totals = await adminQuery(`
      SELECT
        COUNT(*)::int                          AS total_v2_pairs,
        MAX(computed_at)                       AS last_run_at
      FROM app.network_sibling_pairs
      WHERE source = 'detection_pipeline_v2'
    `);

    res.json({
      ok: true,
      byRule: rows,
      total: totals.rows[0] || { total_v2_pairs: 0, last_run_at: null },
    });
  })
);

module.exports = router;

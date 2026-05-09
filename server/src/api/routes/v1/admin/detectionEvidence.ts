/**
 * Detection Evidence Routes
 *
 * GET /api/admin/networks/:bssid/detection-evidence
 *   Returns all surveillance_detections rows for a given BSSID,
 *   ordered by detected_at DESC.
 */

const express = require('express');
const { query } = require('../../../../config/database');
const { validateBSSID } = require('../../../../validation/schemas');
const logger = require('../../../../logging/logger');

export {};

const router = express.Router();

/**
 * GET /api/admin/networks/:bssid/detection-evidence
 *
 * Returns detection evidence from app.surveillance_detections for the given BSSID.
 * Columns returned: device_type, confidence, threat_score, detected_at,
 * detection_method, matched_signals, false_positive, fp_reason, notes.
 */
router.get('/admin/networks/:bssid/detection-evidence', async (req: any, res: any) => {
  try {
    const { bssid } = req.params;

    const bssidValidation = validateBSSID(bssid);
    if (!bssidValidation.valid) {
      return res.status(400).json({ ok: false, error: bssidValidation.error });
    }

    const { rows } = await query(
      `SELECT
          sd.device_type,
          sd.confidence,
          sd.threat_score,
          sd.detected_at,
          sd.detection_method,
          sd.matched_signals,
          sd.false_positive,
          sd.fp_reason,
          sd.notes,
          nt.tags
        FROM app.surveillance_detections sd
        LEFT JOIN app.network_tags nt ON nt.bssid = sd.bssid
        WHERE sd.bssid = $1
        ORDER BY sd.detected_at DESC`,
      [bssid.toUpperCase()]
    );

    res.json({ ok: true, bssid: bssid.toUpperCase(), evidence: rows });
  } catch (err: any) {
    logger.error('[DetectionEvidence] Failed to fetch evidence', { error: err?.message });
    res
      .status(500)
      .json({ ok: false, error: err?.message || 'Failed to fetch detection evidence' });
  }
});

module.exports = router;

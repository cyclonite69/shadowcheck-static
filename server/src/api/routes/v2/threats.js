/**
 * Threats Routes (v2)
 * Handles threat detection endpoints
 */

const express = require('express');
const router = express.Router();
const { query } = require('../../../config/database');
const logger = require('../../../logging/logger');

/**
 * GET /api/v2/threats/severity-counts
 * Returns the count of networks by threat severity.
 */
router.get('/threats/severity-counts', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        final_threat_level as severity,
        COUNT(*) as count
      FROM app.network_threat_scores
      WHERE final_threat_level IS NOT NULL
      GROUP BY final_threat_level
    `);

    // Transform to standard format { critical: X, high: Y, ... }
    const counts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      none: 0,
    };

    result.rows.forEach((row) => {
      const sev = (row.severity || '').toLowerCase();
      // Handle 'med' vs 'medium' mismatch if any, map common variants
      if (sev === 'med' || sev === 'medium') {
        counts.medium += parseInt(row.count, 10);
      } else if (counts[sev] !== undefined) {
        counts[sev] += parseInt(row.count, 10);
      }
    });

    res.json({ counts });
  } catch (error) {
    logger.error(`Threat severity counts error: ${error.message}`, { error });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

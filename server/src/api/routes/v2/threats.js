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
 * Respects current filters including threat level filtering.
 */
router.get('/threats/severity-counts', async (req, res) => {
  try {
    // Parse filters from query parameters
    const filtersParam = req.query.filters;
    const enabledParam = req.query.enabled;

    let filters = {};
    let enabled = {};

    if (filtersParam) {
      try {
        filters = JSON.parse(filtersParam);
      } catch (_e) {
        logger.warn('Invalid filters parameter:', filtersParam);
      }
    }

    if (enabledParam) {
      try {
        enabled = JSON.parse(enabledParam);
      } catch (_e) {
        logger.warn('Invalid enabled parameter:', enabledParam);
      }
    }

    // Build WHERE clause for threat level filtering
    let whereClause = '';
    const params = [];

    if (
      enabled.threatCategories &&
      Array.isArray(filters.threatCategories) &&
      filters.threatCategories.length > 0
    ) {
      // Map frontend threat categories to database values
      const threatLevelMap = {
        critical: 'CRITICAL',
        high: 'HIGH',
        medium: 'MED',
        low: 'LOW',
      };

      const dbThreatLevels = filters.threatCategories
        .map((cat) => threatLevelMap[cat])
        .filter(Boolean);

      if (dbThreatLevels.length > 0) {
        whereClause = `WHERE (
          CASE
            WHEN nt.threat_tag = 'FALSE_POSITIVE' THEN 'NONE'
            WHEN nt.threat_tag = 'INVESTIGATE' THEN COALESCE(nts.final_threat_level, 'NONE')
            ELSE (
              CASE
                WHEN (COALESCE(nts.final_threat_score, 0)::numeric * 0.7 + COALESCE(nt.threat_confidence, 0)::numeric * 100 * 0.3) >= 80 THEN 'CRITICAL'
                WHEN (COALESCE(nts.final_threat_score, 0)::numeric * 0.7 + COALESCE(nt.threat_confidence, 0)::numeric * 100 * 0.3) >= 60 THEN 'HIGH'
                WHEN (COALESCE(nts.final_threat_score, 0)::numeric * 0.7 + COALESCE(nt.threat_confidence, 0)::numeric * 100 * 0.3) >= 40 THEN 'MED'
                WHEN (COALESCE(nts.final_threat_score, 0)::numeric * 0.7 + COALESCE(nt.threat_confidence, 0)::numeric * 100 * 0.3) >= 20 THEN 'LOW'
                ELSE 'NONE'
              END
            )
          END
        ) = ANY($1)`;
        params.push(dbThreatLevels);
      }
    }

    const result = await query(
      `
      SELECT
        CASE
          WHEN nt.threat_tag = 'FALSE_POSITIVE' THEN 'NONE'
          WHEN nt.threat_tag = 'INVESTIGATE' THEN COALESCE(nts.final_threat_level, 'NONE')
          ELSE (
            CASE
              WHEN (COALESCE(nts.final_threat_score, 0)::numeric * 0.7 + COALESCE(nt.threat_confidence, 0)::numeric * 100 * 0.3) >= 80 THEN 'CRITICAL'
              WHEN (COALESCE(nts.final_threat_score, 0)::numeric * 0.7 + COALESCE(nt.threat_confidence, 0)::numeric * 100 * 0.3) >= 60 THEN 'HIGH'
              WHEN (COALESCE(nts.final_threat_score, 0)::numeric * 0.7 + COALESCE(nt.threat_confidence, 0)::numeric * 100 * 0.3) >= 40 THEN 'MED'
              WHEN (COALESCE(nts.final_threat_score, 0)::numeric * 0.7 + COALESCE(nt.threat_confidence, 0)::numeric * 100 * 0.3) >= 20 THEN 'LOW'
              ELSE 'NONE'
            END
          )
        END as severity,
        COUNT(DISTINCT ne.bssid) as unique_networks,
        SUM(ne.observations)::bigint as total_observations
      FROM app.api_network_explorer_mv ne
      LEFT JOIN app.network_threat_scores nts ON nts.bssid = ne.bssid
      LEFT JOIN app.network_tags nt ON nt.bssid = ne.bssid AND nt.threat_tag IS NOT NULL
      ${whereClause}
      GROUP BY 1
    `,
      params
    );

    // Transform to standard format { critical: { unique_networks: N, total_observations: M }, ... }
    const counts = {
      critical: { unique_networks: 0, total_observations: 0 },
      high: { unique_networks: 0, total_observations: 0 },
      medium: { unique_networks: 0, total_observations: 0 },
      low: { unique_networks: 0, total_observations: 0 },
      none: { unique_networks: 0, total_observations: 0 },
    };

    result.rows.forEach((row) => {
      const sev = (row.severity || '').toLowerCase();
      const unique = parseInt(row.unique_networks, 10);
      const total = parseInt(row.total_observations, 10);

      // Handle 'med' vs 'medium' mismatch if any, map common variants
      if (sev === 'med' || sev === 'medium') {
        counts.medium.unique_networks += unique;
        counts.medium.total_observations += total;
      } else if (counts[sev]) {
        counts[sev].unique_networks += unique;
        counts[sev].total_observations += total;
      }
    });

    res.json({ counts });
  } catch (error) {
    logger.error(`Threat severity counts error: ${error.message}`, { error });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

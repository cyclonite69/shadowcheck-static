const express = require('express');
const { query } = require('../../../config/database');

const router = express.Router();

// Minimal, production-safe Networks Explorer endpoint.
// Returns a capped list of networks from mv_network_latest with latest radio metadata.
router.get('/', async (_req, res, next) => {
  try {
    const result = await query(
      `
      SELECT
        ml.bssid,
        ml.ssid,
        ml.type,
        ml.max_level,
        ml.obs_count,
        ml.first_seen,
        ml.last_seen,
        ml.lat,
        ml.lon,
        ap.vendor,
        ap.is_hidden,
        ap.is_5ghz,
        ap.is_6ghz,
        sn.frequency,
        sn.capabilities
      FROM mv_network_latest ml
      LEFT JOIN access_points ap
        ON ap.bssid = ml.bssid
      LEFT JOIN LATERAL (
        SELECT frequency, capabilities
        FROM staging_networks s
        WHERE s.bssid = ml.bssid
        ORDER BY s.lasttime DESC
        LIMIT 1
      ) sn ON true
      ORDER BY ml.last_seen DESC
      LIMIT 500;
      `
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Explicit handler for other methods/routes to avoid silent failures.
router.all('*', (_req, res) => {
  res.status(405).json({ error: 'Method not allowed' });
});

module.exports = router;

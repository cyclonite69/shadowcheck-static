const express = require('express');
const router = express.Router();
const { query } = require('../../../config/database');

/**
 * GET /api/networks/:bssid/nearest-agencies
 * Get nearest agencies to all observation points for a network (local + WiGLE v3)
 */
router.get('/:bssid/nearest-agencies', async (req, res, next) => {
  try {
    const { bssid } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

    const sql = `
      WITH all_observations AS (
        -- Local observations
        SELECT DISTINCT lat, lon, 'local' as source
        FROM app.observations 
        WHERE UPPER(bssid) = UPPER($1) 
          AND lat IS NOT NULL 
          AND lon IS NOT NULL
        UNION
        -- WiGLE v3 observations
        SELECT DISTINCT latitude as lat, longitude as lon, 'wigle' as source
        FROM app.wigle_v3_observations 
        WHERE UPPER(netid) = UPPER($1) 
          AND latitude IS NOT NULL 
          AND longitude IS NOT NULL
      ),
      nearest_per_observation AS (
        SELECT DISTINCT ON (o.lat, o.lon)
          a.id,
          a.name as office_name, 
          a.office_type, 
          a.city, 
          a.state,
          a.postal_code,
          ST_Y(a.location::geometry) as latitude,
          ST_X(a.location::geometry) as longitude,
          ST_Distance(
            ST_SetSRID(ST_MakePoint(o.lon, o.lat), 4326)::geography,
            a.location::geography
          ) / 1000.0 as distance_km,
          o.source = 'wigle' as has_wigle_obs
        FROM all_observations o
        CROSS JOIN app.agency_offices a
        ORDER BY o.lat, o.lon, ST_Distance(
          ST_SetSRID(ST_MakePoint(o.lon, o.lat), 4326)::geography,
          a.location::geography
        ) ASC
      )
      SELECT DISTINCT
        office_name,
        office_type,
        city,
        state,
        postal_code,
        latitude,
        longitude,
        MIN(distance_km) as distance_km,
        BOOL_OR(has_wigle_obs) as has_wigle_obs
      FROM nearest_per_observation
      GROUP BY office_name, office_type, city, state, postal_code, latitude, longitude
      ORDER BY MIN(distance_km) ASC
      LIMIT $2
    `;

    const result = await query(sql, [bssid, limit]);

    res.json({
      ok: true,
      bssid,
      agencies: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

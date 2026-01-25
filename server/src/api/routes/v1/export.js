const express = require('express');
const router = express.Router();
const { query } = require('../../../config/database');

// No authentication required for exports
const requireAuth = (req, res, next) => {
  return next();
};

// Enhanced export query with all important fields
const getEnhancedObservationsQuery = (limit = 50000) => `
  SELECT
    o.bssid,
    COALESCE(n.ssid, 'Unknown') as ssid,
    o.lat as latitude,
    o.lon as longitude,
    o.level as signal_dbm,
    o.time as observed_at,
    o.radio_type,
    o.radio_frequency as frequency,
    o.radio_capabilities as capabilities,
    o.accuracy,
    COALESCE(n.manuf, 'Unknown') as manufacturer,
    COALESCE(n.type, 'Unknown') as device_type,
    COALESCE(n.capabilities, 'Unknown') as encryption,
    n.channel,
    n.firsttime as first_seen,
    n.lasttime as last_seen
  FROM public.observations o
  LEFT JOIN public.networks n ON o.bssid = n.bssid
  ORDER BY o.time DESC
  LIMIT ${limit}
`;

// Export as CSV with all fields
router.get('/csv', requireAuth, async (req, res) => {
  try {
    const result = await query(getEnhancedObservationsQuery(50000));

    const headers = [
      'bssid',
      'ssid',
      'latitude',
      'longitude',
      'signal_dbm',
      'observed_at',
      'radio_type',
      'frequency',
      'channel',
      'capabilities',
      'encryption',
      'manufacturer',
      'device_type',
      'accuracy',
      'first_seen',
      'last_seen',
    ];

    const csv = [
      headers.join(','),
      ...result.rows.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
          })
          .join(',')
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="shadowcheck_export_${Date.now()}.csv"`
    );
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export as JSON with all data
router.get('/json', requireAuth, async (req, res) => {
  try {
    const [observations, networks] = await Promise.all([
      query(getEnhancedObservationsQuery(50000)),
      query('SELECT * FROM public.networks LIMIT 50000'),
    ]);

    const data = {
      exported_at: new Date().toISOString(),
      total_observations: observations.rows.length,
      total_networks: networks.rows.length,
      observations: observations.rows,
      networks: networks.rows,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="shadowcheck_export_${Date.now()}.json"`
    );
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export as GeoJSON with all properties
router.get('/geojson', requireAuth, async (req, res) => {
  try {
    const result = await query(getEnhancedObservationsQuery(50000));

    const features = result.rows.map((row) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [row.longitude, row.latitude],
      },
      properties: {
        bssid: row.bssid,
        ssid: row.ssid,
        signal_dbm: row.signal_dbm,
        observed_at: row.observed_at,
        radio_type: row.radio_type,
        frequency: row.frequency,
        channel: row.channel,
        capabilities: row.capabilities,
        encryption: row.encryption,
        manufacturer: row.manufacturer,
        device_type: row.device_type,
        accuracy: row.accuracy,
        first_seen: row.first_seen,
        last_seen: row.last_seen,
      },
    }));

    const geojson = {
      type: 'FeatureCollection',
      features: features,
      metadata: {
        exported_at: new Date().toISOString(),
        total_features: features.length,
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="shadowcheck_export_${Date.now()}.geojson"`
    );
    res.json(geojson);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

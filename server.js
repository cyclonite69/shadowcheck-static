console.log('Starting server...');

try {
    require('dotenv').config({ override: true });
    const express = require('express');
    const path = require('path');
    const { Pool } = require('pg');

    const app = express();
    const port = process.env.PORT || 3000;


    // Database connection configuration
    const pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });

    // Minimum valid timestamp: January 1, 2000 00:00:00 UTC in milliseconds
    const MIN_VALID_TIMESTAMP = 946684800000;

    // Database query wrapper with retry logic for transient errors
    async function query(text, params = [], tries = 2) {
      try {
        return await pool.query(text, params);
      } catch (error) {
        // Retry on transient errors
        const transientErrors = ['57P01', '53300', '08006', '08003', '08000'];
        const isTransient = transientErrors.includes(error.code) ||
                          error.message?.includes('ETIMEDOUT') ||
                          error.message?.includes('ECONNRESET');

        if (isTransient && tries > 1) {
          console.warn(`Transient database error, retrying... (${tries - 1} attempts left)`, error.message);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return query(text, params, tries - 1);
        }
        throw error;
      }
    }

    // Test database connection
    pool.connect((err, client, release) => {
      if (err) {
        return console.error('✗ Database connection failed:', err.message);
      }
      client.query('SELECT NOW()', (err, result) => {
        release();
        if (err) {
          return console.error('✗ Database connection failed:', err.message);
        }
        console.log('✓ Database connected successfully');
      });
    });

    // Parse JSON request bodies
    app.use(express.json());

    // Serve static files from the 'public' directory
    app.use(express.static(path.join(__dirname, 'public')));

    // Serve the HTML file
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // API endpoint to get dashboard metrics
    app.get('/api/dashboard-metrics', async (req, res) => {
      try {
        const totalNetworksQuery = 'SELECT COUNT(*) FROM app.networks_legacy';
        // Count actual detected threats using threat detection logic
        const threatsQuery = `
          WITH home_location AS (
            SELECT location_point::geography as home_point
            FROM app.location_markers
            WHERE marker_type = 'home'
            LIMIT 1
          ),
          network_stats AS (
            SELECT
              n.bssid,
              n.type,
              COUNT(DISTINCT l.unified_id) as observation_count,
              COUNT(DISTINCT DATE(to_timestamp(l.time / 1000.0))) as unique_days,
              BOOL_OR(ST_Distance(
                ST_SetSRID(ST_MakePoint(l.lon, l.lat), 4326)::geography,
                h.home_point
              ) < 100) as seen_at_home,
              BOOL_OR(ST_Distance(
                ST_SetSRID(ST_MakePoint(l.lon, l.lat), 4326)::geography,
                h.home_point
              ) > 500) as seen_away_from_home,
              MAX(ST_Distance(
                ST_SetSRID(ST_MakePoint(l.lon, l.lat), 4326)::geography,
                h.home_point
              )) / 1000.0 - MIN(ST_Distance(
                ST_SetSRID(ST_MakePoint(l.lon, l.lat), 4326)::geography,
                h.home_point
              )) / 1000.0 as distance_range_km
            FROM app.networks_legacy n
            JOIN app.locations_legacy l ON n.bssid = l.bssid
            CROSS JOIN home_location h
            WHERE l.lat IS NOT NULL AND l.lon IS NOT NULL
              AND l.time >= $1
            GROUP BY n.bssid, n.type
            HAVING COUNT(DISTINCT l.unified_id) >= 2
          )
          SELECT COUNT(*) FROM network_stats
          WHERE (
            CASE WHEN seen_at_home AND seen_away_from_home THEN 40 ELSE 0 END +
            CASE WHEN distance_range_km > 0.2 THEN 25 ELSE 0 END +
            CASE WHEN unique_days >= 7 THEN 15 WHEN unique_days >= 3 THEN 10 WHEN unique_days >= 2 THEN 5 ELSE 0 END +
            CASE WHEN observation_count >= 50 THEN 10 WHEN observation_count >= 20 THEN 5 ELSE 0 END
          ) >= 30
          -- Filter out cellular networks (GSM, LTE, 5G) unless they have >5km distance range
          AND (
            type NOT IN ('G', 'L', 'N')
            OR distance_range_km > 5
          )
        `;
        // Count networks with privacy concerns (open networks)
        const suspiciousQuery = "SELECT COUNT(*) FROM app.networks_legacy WHERE encryption = 'Open' OR encryption IS NULL";
        // Count networks that have WiGLE enrichment data
        const enrichedQuery = `
          SELECT COUNT(DISTINCT bssid)
          FROM app.wigle_networks_enriched
          WHERE trilaterated_lat IS NOT NULL OR first_seen IS NOT NULL
        `;

        const [totalNetworksRes, threatsRes, suspiciousRes, enrichedRes] = await Promise.all([
          query(totalNetworksQuery),
          query(threatsQuery, [MIN_VALID_TIMESTAMP]),
          query(suspiciousQuery),
          query(enrichedQuery),
        ]);

        const metrics = {
          totalNetworks: parseInt(totalNetworksRes.rows[0].count),
          threatsCount: parseInt(threatsRes.rows[0].count),
          surveillanceCount: parseInt(suspiciousRes.rows[0].count),
          enrichedCount: parseInt(enrichedRes.rows[0].count),
        };

        res.json(metrics);
      } catch (err) {
        console.error('Error fetching dashboard metrics:', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // API endpoint for analytics - network types distribution with proper WiGLE categories
    app.get('/api/analytics/network-types', async (req, res) => {
      try {
        const { rows } = await query(`
          SELECT
            CASE
              WHEN type = 'W' THEN 'WiFi'
              WHEN type = 'E' THEN 'BLE'
              WHEN type = 'B' AND (frequency < 5000 OR capabilities LIKE '%BLE%') THEN 'BLE'
              WHEN type = 'B' THEN 'BT'
              WHEN type = 'L' THEN 'LTE'
              WHEN type = 'N' THEN 'NR'
              WHEN type = 'G' AND capabilities LIKE '%LTE%' THEN 'LTE'
              WHEN type = 'G' THEN 'GSM'
              ELSE type
            END as network_type,
            COUNT(*) as count
          FROM app.networks_legacy
          WHERE type IS NOT NULL
          GROUP BY network_type
          ORDER BY count DESC
        `);

        res.json({
          ok: true,
          data: rows.map(row => ({
            type: row.network_type,
            count: parseInt(row.count)
          }))
        });
      } catch (err) {
        console.error('Error fetching network types:', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // API endpoint for analytics - signal strength distribution
    app.get('/api/analytics/signal-strength', async (req, res) => {
      try {
        const { rows } = await query(`
          SELECT
            CASE
              WHEN bestlevel >= -30 THEN '-30'
              WHEN bestlevel >= -40 THEN '-40'
              WHEN bestlevel >= -50 THEN '-50'
              WHEN bestlevel >= -60 THEN '-60'
              WHEN bestlevel >= -70 THEN '-70'
              WHEN bestlevel >= -80 THEN '-80'
              ELSE '-90'
            END as signal_range,
            COUNT(*) as count
          FROM app.networks_legacy
          WHERE bestlevel IS NOT NULL
          GROUP BY signal_range
          ORDER BY signal_range DESC
        `);

        res.json({
          ok: true,
          data: rows.map(row => ({
            range: row.signal_range,
            count: parseInt(row.count)
          }))
        });
      } catch (err) {
        console.error('Error fetching signal strength:', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // API endpoint for analytics - temporal activity
    app.get('/api/analytics/temporal-activity', async (req, res) => {
      try {
        const { rows } = await query(`
          SELECT
            EXTRACT(HOUR FROM last_seen) as hour,
            COUNT(*) as count
          FROM app.networks_legacy
          WHERE last_seen IS NOT NULL
            AND EXTRACT(EPOCH FROM last_seen) * 1000 >= $1
          GROUP BY hour
          ORDER BY hour
        `, [MIN_VALID_TIMESTAMP]);

        res.json({
          ok: true,
          data: rows.map(row => ({
            hour: parseInt(row.hour),
            count: parseInt(row.count)
          }))
        });
      } catch (err) {
        console.error('Error fetching temporal activity:', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // API endpoint for analytics - radio type over time (last 30 days)
    app.get('/api/analytics/radio-type-over-time', async (req, res) => {
      try {
        const range = req.query.range || '30d';

        // Determine time interval and grouping
        let interval = '30 days';
        let dateFormat = 'DATE(last_seen)';

        switch(range) {
          case '24h':
            interval = '24 hours';
            dateFormat = "DATE_TRUNC('hour', last_seen)";
            break;
          case '7d':
            interval = '7 days';
            dateFormat = 'DATE(last_seen)';
            break;
          case '30d':
            interval = '30 days';
            dateFormat = 'DATE(last_seen)';
            break;
          case '90d':
            interval = '90 days';
            dateFormat = 'DATE(last_seen)';
            break;
          case 'all':
            interval = '100 years'; // Effectively all time
            dateFormat = "DATE_TRUNC('week', last_seen)";
            break;
        }

        const whereClause = range === 'all'
          ? 'WHERE last_seen IS NOT NULL AND EXTRACT(EPOCH FROM last_seen) * 1000 >= $1'
          : `WHERE last_seen >= NOW() - INTERVAL '${interval}' AND last_seen IS NOT NULL AND EXTRACT(EPOCH FROM last_seen) * 1000 >= $1`;

        const { rows } = await query(`
          WITH time_counts AS (
            SELECT
              ${dateFormat} as date,
              CASE
                WHEN type = 'W' THEN 'WiFi'
                WHEN type = 'E' THEN 'BLE'
                WHEN type = 'B' AND (frequency < 5000 OR capabilities LIKE '%BLE%') THEN 'BLE'
                WHEN type = 'B' THEN 'BT'
                WHEN type = 'L' THEN 'LTE'
                WHEN type = 'N' THEN 'NR'
                WHEN type = 'G' AND capabilities LIKE '%LTE%' THEN 'LTE'
                WHEN type = 'G' THEN 'GSM'
                ELSE 'Other'
              END as network_type,
              COUNT(*) as count
            FROM app.networks_legacy
            ${whereClause}
            GROUP BY date, network_type
            ORDER BY date, network_type
          )
          SELECT * FROM time_counts
        `, [MIN_VALID_TIMESTAMP]);

        res.json({
          ok: true,
          data: rows.map(row => ({
            date: row.date,
            type: row.network_type,
            count: parseInt(row.count)
          }))
        });
      } catch (err) {
        console.error('Error fetching radio type over time:', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // API endpoint for analytics - security analysis
    app.get('/api/analytics/security', async (req, res) => {
      try {
        const { rows } = await query(`
          SELECT
            CASE
              -- WPA3 variants
              WHEN capabilities ILIKE '%WPA3%' AND capabilities ILIKE '%ENT%' THEN 'WPA3-E'
              WHEN capabilities ILIKE '%WPA3%' AND (capabilities ILIKE '%SAE%' OR capabilities ILIKE '%PSK%') THEN 'WPA3-P'
              WHEN capabilities ILIKE '%WPA3%' THEN 'WPA3'

              -- WPA2 variants
              WHEN capabilities ILIKE '%WPA2%' AND capabilities ILIKE '%ENT%' THEN 'WPA2-E'
              WHEN capabilities ILIKE '%WPA2%' AND capabilities ILIKE '%PSK%' THEN 'WPA2-P'
              WHEN capabilities ILIKE '%WPA2%' THEN 'WPA2'

              -- WPA (original)
              WHEN capabilities ILIKE '%WPA%' AND NOT capabilities ILIKE '%WPA2%' AND NOT capabilities ILIKE '%WPA3%' THEN 'WPA'

              -- WEP
              WHEN capabilities ILIKE '%WEP%' THEN 'WEP'

              -- WPS (WiFi Protected Setup)
              WHEN capabilities ILIKE '%WPS%' AND (capabilities IS NULL OR capabilities = '' OR NOT capabilities ILIKE '%WPA%') THEN 'WPS'

              -- Open networks
              WHEN capabilities IS NULL OR capabilities = '' OR capabilities ILIKE '%ESS%' THEN 'OPEN'

              ELSE 'OPEN'
            END as security_type,
            COUNT(*) as count
          FROM app.networks_legacy
          WHERE type = 'W'  -- WiFi networks only
          GROUP BY security_type
          ORDER BY count DESC
        `);

        res.json({
          ok: true,
          data: rows.map(row => ({
            type: row.security_type,
            count: parseInt(row.count)
          }))
        });
      } catch (err) {
        console.error('Error fetching security analysis:', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // API endpoint for quick threat detection with pagination
    app.get('/api/threats/quick', async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const offset = (page - 1) * limit;

        const { rows } = await query(`
          WITH home_location AS (
            SELECT location_point::geography as home_point
            FROM app.location_markers
            WHERE marker_type = 'home'
            LIMIT 1
          ),
          network_stats AS (
            SELECT
              n.bssid,
              n.ssid,
              n.type,
              n.encryption,
              COUNT(DISTINCT l.unified_id) as observation_count,
              COUNT(DISTINCT DATE(to_timestamp(l.time / 1000.0))) as unique_days,
              MIN(l.time) as first_seen,
              MAX(l.time) as last_seen,
              MIN(ST_Distance(
                ST_SetSRID(ST_MakePoint(l.lon, l.lat), 4326)::geography,
                h.home_point
              )) / 1000.0 as min_distance_from_home_km,
              MAX(ST_Distance(
                ST_SetSRID(ST_MakePoint(l.lon, l.lat), 4326)::geography,
                h.home_point
              )) / 1000.0 as max_distance_from_home_km,
              BOOL_OR(ST_Distance(
                ST_SetSRID(ST_MakePoint(l.lon, l.lat), 4326)::geography,
                h.home_point
              ) < 100) as seen_at_home,
              BOOL_OR(ST_Distance(
                ST_SetSRID(ST_MakePoint(l.lon, l.lat), 4326)::geography,
                h.home_point
              ) > 500) as seen_away_from_home
            FROM app.networks_legacy n
            JOIN app.locations_legacy l ON n.bssid = l.bssid
            CROSS JOIN home_location h
            WHERE l.lat IS NOT NULL AND l.lon IS NOT NULL
              AND l.time >= $1
            GROUP BY n.bssid, n.ssid, n.type, n.encryption
            HAVING COUNT(DISTINCT l.unified_id) >= 2
          )
          SELECT
            ns.bssid,
            ns.ssid,
            ns.type,
            ns.encryption,
            ns.observation_count,
            ns.unique_days,
            ns.first_seen,
            ns.last_seen,
            ns.min_distance_from_home_km,
            ns.max_distance_from_home_km,
            (ns.max_distance_from_home_km - ns.min_distance_from_home_km) as distance_range_km,
            (ns.last_seen - ns.first_seen) as observation_timespan_ms,
            ns.seen_at_home,
            ns.seen_away_from_home,
            (
              CASE WHEN ns.seen_at_home AND ns.seen_away_from_home THEN 40 ELSE 0 END +
              CASE WHEN ns.max_distance_from_home_km - ns.min_distance_from_home_km > 0.2 THEN 25 ELSE 0 END +
              CASE WHEN ns.unique_days >= 7 THEN 15 WHEN ns.unique_days >= 3 THEN 10 WHEN ns.unique_days >= 2 THEN 5 ELSE 0 END +
              CASE WHEN ns.observation_count >= 50 THEN 10 WHEN ns.observation_count >= 20 THEN 5 ELSE 0 END
            ) as threat_score,
            CASE
              WHEN ns.seen_at_home AND ns.seen_away_from_home THEN 'Potential Tracking Device'
              WHEN ns.max_distance_from_home_km - ns.min_distance_from_home_km > 1 THEN 'Mobile Device Pattern'
              ELSE 'Movement Detected'
            END as threat_type,
            -- Include user tags and ML threat scores
            nt.tag_type as user_tag,
            nt.threat_score as user_threat_score,
            nt.ml_confidence,
            nt.confidence as user_confidence,
            nt.notes as user_notes,
            nt.user_override,
            -- Add total count using window function
            COUNT(*) OVER() as total_count
          FROM network_stats ns
          LEFT JOIN app.network_tags nt ON ns.bssid = nt.bssid
          WHERE (
            CASE WHEN ns.seen_at_home AND ns.seen_away_from_home THEN 40 ELSE 0 END +
            CASE WHEN ns.max_distance_from_home_km - ns.min_distance_from_home_km > 0.2 THEN 25 ELSE 0 END +
            CASE WHEN ns.unique_days >= 7 THEN 15 WHEN ns.unique_days >= 3 THEN 10 WHEN ns.unique_days >= 2 THEN 5 ELSE 0 END +
            CASE WHEN ns.observation_count >= 50 THEN 10 WHEN ns.observation_count >= 20 THEN 5 ELSE 0 END
          ) >= 30
          -- Filter out cellular networks (GSM, LTE, 5G) unless they have >5km distance range
          AND (
            ns.type NOT IN ('G', 'L', 'N')
            OR (ns.max_distance_from_home_km - ns.min_distance_from_home_km) > 5
          )
          ORDER BY
            ns.max_distance_from_home_km DESC,
            (
              CASE WHEN ns.seen_at_home AND ns.seen_away_from_home THEN 40 ELSE 0 END +
              CASE WHEN ns.max_distance_from_home_km - ns.min_distance_from_home_km > 0.2 THEN 25 ELSE 0 END +
              CASE WHEN ns.unique_days >= 7 THEN 15 WHEN ns.unique_days >= 3 THEN 10 WHEN ns.unique_days >= 2 THEN 5 ELSE 0 END +
              CASE WHEN ns.observation_count >= 50 THEN 10 WHEN ns.observation_count >= 20 THEN 5 ELSE 0 END
            ) DESC,
            ns.unique_days DESC,
            ns.observation_count DESC
          LIMIT $2 OFFSET $3
        `, [MIN_VALID_TIMESTAMP, limit, offset]);

        const totalCount = rows.length > 0 ? parseInt(rows[0].total_count) : 0;

        res.json({
          ok: true,
          page: page,
          limit: limit,
          count: rows.length,
          total: totalCount,
          threats: rows.map(row => ({
            bssid: row.bssid,
            ssid: row.ssid,
            type: row.type,
            encryption: row.encryption,
            totalObservations: row.observation_count,
            threatScore: parseInt(row.threat_score),
            threatType: row.threat_type,
            confidence: row.observation_count >= 10 ? 'High' : row.observation_count >= 5 ? 'Medium' : 'Low',
            firstSeen: row.first_seen,
            lastSeen: row.last_seen,
            timespanDays: Math.round(parseInt(row.observation_timespan_ms) / (1000 * 60 * 60 * 24)),
            patterns: {
              seenAtHome: row.seen_at_home,
              seenAwayFromHome: row.seen_away_from_home,
              maxDistanceBetweenObsKm: parseFloat(row.distance_range_km),
              uniqueDaysObserved: row.unique_days,
              maxSpeedKmh: 0,
              distancesFromHomeKm: [parseFloat(row.min_distance_from_home_km), parseFloat(row.max_distance_from_home_km)]
            },
            // User tagging data
            userTag: row.user_tag,
            userThreatScore: row.user_threat_score ? parseFloat(row.user_threat_score) : null,
            mlConfidence: row.ml_confidence ? parseFloat(row.ml_confidence) : null,
            userConfidence: row.user_confidence ? parseFloat(row.user_confidence) : null,
            userNotes: row.user_notes,
            userOverride: row.user_override || false,
            isTagged: row.user_tag ? true : false
          }))
        });
      } catch (err) {
        console.error('Error detecting threats (quick):', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
      }
    });

    // API endpoint for advanced threat detection
    app.get('/api/threats/detect', async (req, res) => {
      try {
        const { rows } = await query(`
          WITH home_location AS (
            -- Get home coordinates from location_markers
            SELECT
              ST_X(location_point::geometry) as home_lon,
              ST_Y(location_point::geometry) as home_lat,
              location_point::geography as home_point
            FROM app.location_markers
            WHERE marker_type = 'home'
            LIMIT 1
          ),
          network_locations AS (
            -- Get all networks with their observation locations
            SELECT
              n.bssid,
              n.ssid,
              n.type,
              n.encryption,
              l.lat,
              l.lon,
              l.time,
              ST_SetSRID(ST_MakePoint(l.lon, l.lat), 4326)::geography as point,
              ROW_NUMBER() OVER (PARTITION BY n.bssid ORDER BY l.time) as obs_number,
              COUNT(*) OVER (PARTITION BY n.bssid) as total_observations
            FROM app.networks_legacy n
            JOIN app.locations_legacy l ON n.bssid = l.bssid
            WHERE l.lat IS NOT NULL AND l.lon IS NOT NULL
              AND l.time >= $1
          ),
          threat_analysis AS (
            SELECT
              nl.bssid,
              nl.ssid,
              nl.type,
              nl.encryption,
              nl.total_observations,

              -- Distance from home for each observation
              ARRAY_AGG(
                ROUND(ST_Distance(nl.point, h.home_point)::numeric / 1000, 3)
                ORDER BY nl.time
              ) as distances_from_home_km,

              -- Check if seen at home (within 100m)
              BOOL_OR(ST_Distance(nl.point, h.home_point) < 100) as seen_at_home,

              -- Check if seen far from home (>500m)
              BOOL_OR(ST_Distance(nl.point, h.home_point) > 500) as seen_away_from_home,

              -- Calculate max distance between ANY two observations
              MAX(ST_Distance(nl1.point, nl2.point)) / 1000 as max_distance_between_obs_km,

              -- Time span of observations
              MAX(nl.time) - MIN(nl.time) as observation_timespan_ms,

              -- Unique days observed
              COUNT(DISTINCT DATE(to_timestamp(nl.time / 1000.0))) as unique_days_observed,

              -- Average movement speed (if moved more than WiFi range)
              CASE
                WHEN MAX(nl.time) > MIN(nl.time) THEN
                  (MAX(ST_Distance(nl1.point, nl2.point)) / 1000.0) /
                  (EXTRACT(EPOCH FROM (to_timestamp(MAX(nl.time) / 1000.0) - to_timestamp(MIN(nl.time) / 1000.0))) / 3600.0)
                ELSE 0
              END as max_speed_kmh

            FROM network_locations nl
            CROSS JOIN home_location h
            LEFT JOIN network_locations nl1 ON nl.bssid = nl1.bssid
            LEFT JOIN network_locations nl2 ON nl.bssid = nl2.bssid AND nl1.obs_number < nl2.obs_number
            WHERE nl.total_observations >= 2
            GROUP BY nl.bssid, nl.ssid, nl.type, nl.encryption, nl.total_observations
          ),
          threat_classification AS (
            SELECT
              *,
              -- Threat Score Calculation (0-100)
              (
                -- High threat: Seen at home AND away (possible tracking device)
                CASE WHEN seen_at_home AND seen_away_from_home THEN 40 ELSE 0 END +

                -- Medium threat: Multiple distant observations beyond WiFi range (200m)
                CASE WHEN max_distance_between_obs_km > 0.2 THEN 25 ELSE 0 END +

                -- High threat: Rapid movement (>50 km/h suggests vehicle tracking)
                CASE
                  WHEN max_speed_kmh > 100 THEN 20  -- Very fast movement
                  WHEN max_speed_kmh > 50 THEN 15   -- Highway speed
                  WHEN max_speed_kmh > 20 THEN 10   -- City driving
                  ELSE 0
                END +

                -- Medium threat: Observed over multiple days (persistent tracking)
                CASE
                  WHEN unique_days_observed >= 7 THEN 15
                  WHEN unique_days_observed >= 3 THEN 10
                  WHEN unique_days_observed >= 2 THEN 5
                  ELSE 0
                END +

                -- Low threat: Many observations (could be legitimate or surveillance)
                CASE
                  WHEN total_observations >= 50 THEN 10
                  WHEN total_observations >= 20 THEN 5
                  ELSE 0
                END
              ) as threat_score,

              -- Threat Type Classification
              CASE
                WHEN seen_at_home AND seen_away_from_home AND max_speed_kmh > 20 THEN 'Mobile Tracking Device'
                WHEN seen_at_home AND seen_away_from_home THEN 'Potential Stalking Device'
                WHEN max_distance_between_obs_km > 1 AND unique_days_observed > 1 THEN 'Following Pattern Detected'
                WHEN max_speed_kmh > 100 THEN 'High-Speed Vehicle Tracker'
                WHEN NOT seen_at_home AND max_distance_between_obs_km > 0.5 THEN 'Mobile Device (Non-Home)'
                ELSE 'Low Risk Movement'
              END as threat_type,

              -- Confidence Level
              CASE
                WHEN total_observations >= 10 AND unique_days_observed >= 3 THEN 'High'
                WHEN total_observations >= 5 THEN 'Medium'
                ELSE 'Low'
              END as confidence

            FROM threat_analysis
          )
          SELECT
            bssid,
            ssid,
            type,
            encryption,
            total_observations,
            threat_score,
            threat_type,
            confidence,
            seen_at_home,
            seen_away_from_home,
            max_distance_between_obs_km,
            observation_timespan_ms,
            unique_days_observed,
            ROUND(max_speed_kmh::numeric, 2) as max_speed_kmh,
            distances_from_home_km
          FROM threat_classification
          WHERE threat_score >= 30  -- Only return significant threats
            -- Filter out cellular networks (GSM, LTE, 5G) unless they have >5km distance range
            AND (
              type NOT IN ('G', 'L', 'N')
              OR max_distance_between_obs_km > 5
            )
          ORDER BY threat_score DESC, total_observations DESC
        `, [MIN_VALID_TIMESTAMP]);

        res.json({
          ok: true,
          threats: rows.map(row => ({
            bssid: row.bssid,
            ssid: row.ssid,
            type: row.type,
            encryption: row.encryption,
            totalObservations: row.total_observations,
            threatScore: parseInt(row.threat_score),
            threatType: row.threat_type,
            confidence: row.confidence,
            patterns: {
              seenAtHome: row.seen_at_home,
              seenAwayFromHome: row.seen_away_from_home,
              maxDistanceBetweenObsKm: parseFloat(row.max_distance_between_obs_km),
              observationTimespanMs: row.observation_timespan_ms,
              uniqueDaysObserved: row.unique_days_observed,
              maxSpeedKmh: parseFloat(row.max_speed_kmh),
              distancesFromHomeKm: row.distances_from_home_km
            }
          }))
        });
      } catch (err) {
        console.error('Error detecting threats:', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // API endpoint to get all observations for a specific network
    app.get('/api/networks/observations/:bssid', async (req, res) => {
      try {
        const { bssid } = req.params;

        // Get home location
        const homeResult = await query(`
          SELECT
            ST_X(location_point::geometry) as lon,
            ST_Y(location_point::geometry) as lat
          FROM app.location_markers
          WHERE marker_type = 'home'
          LIMIT 1
        `);

        const home = homeResult.rows[0] || null;

        // Get all observations for this BSSID
        const { rows } = await query(`
          SELECT
            l.unified_id as id,
            l.bssid,
            n.ssid,
            n.type,
            n.encryption,
            n.capabilities,
            l.lat,
            l.lon,
            l.level as signal,
            l.time,
            l.accuracy,
            l.altitude,
            CASE
              WHEN $1::numeric IS NOT NULL AND $2::numeric IS NOT NULL THEN
                ST_Distance(
                  ST_SetSRID(ST_MakePoint(l.lon, l.lat), 4326)::geography,
                  ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
                ) / 1000.0
              ELSE NULL
            END as distance_from_home_km
          FROM app.locations_legacy l
          LEFT JOIN app.networks_legacy n ON l.bssid = n.bssid
          WHERE l.bssid = $3
            AND l.lat IS NOT NULL
            AND l.lon IS NOT NULL
            AND l.time >= $4
          ORDER BY l.time ASC
        `, [home?.lon, home?.lat, bssid, MIN_VALID_TIMESTAMP]);

        res.json({
          ok: true,
          bssid: bssid,
          observations: rows,
          home: home,
          count: rows.length
        });
      } catch (err) {
        console.error('Error fetching network observations:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
      }
    });

    // API endpoint to tag a network
    app.post('/api/tag-network', async (req, res) => {
      try {
        const { bssid, tag_type, confidence, notes } = req.body;

        if (!bssid || !tag_type) {
          return res.status(400).json({ error: 'BSSID and tag_type are required' });
        }

        // Get network SSID
        const networkResult = await query(`
          SELECT ssid FROM app.networks_legacy WHERE bssid = $1 LIMIT 1
        `, [bssid]);

        const ssid = networkResult.rows[0]?.ssid || null;

        // Map confidence 0-100 to 0.0-1.0
        const confidenceDecimal = confidence ? confidence / 100.0 : 0.5;

        // Map tag_type to threat_score
        const threatScoreMap = {
          'LEGIT': 0.0,
          'FALSE_POSITIVE': 0.05,
          'INVESTIGATE': 0.7,
          'THREAT': 1.0
        };
        const threatScore = threatScoreMap[tag_type] || 0.5;

        // Upsert tag
        const result = await query(`
          INSERT INTO app.network_tags (
            bssid, ssid, tag_type, confidence, notes,
            threat_score, ml_confidence, user_override,
            tagged_at, tag_history, model_version
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, 1)
          ON CONFLICT (bssid, tag_type)
          DO UPDATE SET
            confidence = $4,
            notes = COALESCE($5, network_tags.notes),
            threat_score = $6,
            tagged_at = NOW(),
            tag_history = network_tags.tag_history || $10
          RETURNING id, bssid, tag_type, threat_score, ml_confidence, confidence
        `, [
          bssid,
          ssid,
          tag_type,
          confidenceDecimal,
          notes || null,
          threatScore,
          confidenceDecimal,  // Use user confidence as initial ML confidence
          true,  // user_override
          JSON.stringify([{
            tag_type: tag_type,
            confidence: confidenceDecimal,
            timestamp: new Date().toISOString(),
            source: 'quick_tag'
          }]),
          JSON.stringify({
            tag_type: tag_type,
            confidence: confidenceDecimal,
            timestamp: new Date().toISOString(),
            source: 'quick_tag'
          })
        ]);

        res.json({
          ok: true,
          tag: result.rows[0]
        });
      } catch (err) {
        console.error('Error tagging network:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
      }
    });

    // API endpoint to get manufacturer from BSSID
    app.get('/api/manufacturer/:bssid', async (req, res) => {
      try {
        const { bssid } = req.params;

        // Query the radio_manufacturers table
        // Remove colons from BSSID for matching (e.g., "AA:BB:CC:DD:EE:FF" -> "AABBCC")
        const { rows } = await query(`
          SELECT organization_name
          FROM app.radio_manufacturers
          WHERE UPPER(REPLACE($1, ':', '')) LIKE UPPER(oui_prefix_24bit) || '%'
          LIMIT 1
        `, [bssid]);

        if (rows.length > 0) {
          res.json({
            ok: true,
            manufacturer: rows[0].organization_name
          });
        } else {
          res.json({
            ok: true,
            manufacturer: null
          });
        }
      } catch (err) {
        console.error('Error fetching manufacturer:', err);
        res.status(500).json({ ok: false, error: 'Internal server error' });
      }
    });

    // API endpoint to get networks with location data
    app.get('/api/networks', async (req, res) => {
      try {
        // Get home location for distance calculation
        const homeResult = await query(`
          SELECT
            ST_X(location_point::geometry) as lon,
            ST_Y(location_point::geometry) as lat
          FROM app.location_markers
          WHERE marker_type = 'home'
          LIMIT 1
        `);
        const home = homeResult.rows[0] || null;

        // Join networks_legacy with locations_legacy to get the latest location data
        const { rows } = await query(`
          WITH latest_locations AS (
            SELECT DISTINCT ON (bssid)
              bssid,
              lat,
              lon,
              level,
              accuracy,
              time
            FROM app.locations_legacy
            WHERE lat IS NOT NULL AND lon IS NOT NULL
              AND time >= $1
            ORDER BY bssid, time DESC
          ),
          observation_counts AS (
            SELECT
              bssid,
              COUNT(*) as obs_count
            FROM app.locations_legacy
            WHERE time >= $1
            GROUP BY bssid
          )
          SELECT
            n.unified_id,
            n.ssid,
            n.bssid,
            n.type,
            n.encryption as security,
            n.frequency,
            n.channel,
            COALESCE(l.level, n.bestlevel) as signal,
            COALESCE(l.accuracy, 0) as accuracy,
            n.lasttime as "lastSeen",
            COALESCE(l.lat, n.bestlat, n.lastlat, n.trilaterated_lat) as lat,
            COALESCE(l.lon, n.bestlon, n.lastlon, n.trilaterated_lon) as lng,
            COALESCE(oc.obs_count, 1) as observations,
            n.capabilities as misc,
            CASE
              WHEN COALESCE(l.level, n.bestlevel) > -50 THEN 'threat'
              WHEN COALESCE(l.level, n.bestlevel) > -70 THEN 'warning'
              ELSE 'safe'
            END as status,
            CASE
              WHEN $2::double precision IS NOT NULL AND $3::double precision IS NOT NULL
                AND COALESCE(l.lat, n.bestlat) IS NOT NULL AND COALESCE(l.lon, n.bestlon) IS NOT NULL
              THEN ST_Distance(
                ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography,
                ST_SetSRID(ST_MakePoint(COALESCE(l.lon, n.bestlon), COALESCE(l.lat, n.bestlat)), 4326)::geography
              ) / 1000.0
              ELSE NULL
            END as distance_from_home
          FROM app.networks_legacy n
          LEFT JOIN latest_locations l ON n.bssid = l.bssid
          LEFT JOIN observation_counts oc ON n.bssid = oc.bssid
          WHERE n.bssid IS NOT NULL
            AND (n.lasttime IS NULL OR n.lasttime >= $1)
          ORDER BY n.lasttime DESC NULLS LAST
        `, [MIN_VALID_TIMESTAMP, home?.lat || null, home?.lon || null]);

        const networks = rows.map(row => ({
          id: row.unified_id,
          ssid: row.ssid,
          bssid: row.bssid,
          type: row.type || 'W',
          security: row.security,
          frequency: row.frequency ? parseFloat(row.frequency) / 1000 : null, // Convert MHz to GHz
          channel: row.channel,
          signal: row.signal,
          accuracy: row.accuracy,
          observations: row.observations,
          lastSeen: row.lastSeen,
          timestamp: row.lastSeen, // Alias for consistency
          status: row.status,
          distanceFromHome: row.distance_from_home,
          latitude: row.lat ? parseFloat(row.lat) : null,
          longitude: row.lng ? parseFloat(row.lng) : null,
          misc: row.misc,
          location: {
            lat: row.lat ? parseFloat(row.lat) : null,
            lng: row.lng ? parseFloat(row.lng) : null,
          },
        }));

        res.json(networks);
      } catch (err) {
        console.error('Error fetching networks:', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // API endpoint to search for networks by SSID
    app.get('/api/networks/search/:ssid', async (req, res) => {
      try {
        const { ssid } = req.params;
        const searchPattern = `%${ssid}%`;

        const { rows } = await query(`
          SELECT
            n.unified_id,
            n.ssid,
            n.bssid,
            n.type,
            n.encryption,
            n.bestlevel as signal,
            n.lasttime,
            COUNT(DISTINCT l.unified_id) as observation_count
          FROM app.networks_legacy n
          LEFT JOIN app.locations_legacy l ON n.bssid = l.bssid
          WHERE n.ssid ILIKE $1
          GROUP BY n.unified_id, n.ssid, n.bssid, n.type, n.encryption, n.bestlevel, n.lasttime
          ORDER BY observation_count DESC
          LIMIT 50
        `, [searchPattern]);

        res.json({
          ok: true,
          query: ssid,
          count: rows.length,
          networks: rows
        });
      } catch (err) {
        console.error('Error searching networks:', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });

} catch (err) {
    console.error('Server startup error:', err);
}
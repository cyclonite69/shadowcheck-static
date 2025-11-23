console.log('Starting server...');

try {
    require('dotenv').config({ override: true });
    const express = require('express');
    const path = require('path');
    const { Pool } = require('pg');
    const errorHandler = require('./utils/errorHandler');
    const rateLimit = require('express-rate-limit');
    const cors = require('cors');
    const compression = require('compression');

    const app = express();
    const port = process.env.PORT || 3001;

    // Enable gzip compression
    app.use(compression());

    // Enable CORS for all routes
    app.use(cors());

    // Apply to all requests
    // Rate limiting to prevent abuse
    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs (increased for development)
      message: 'Too many requests from this IP, please try again after 15 minutes'
    });

    // Apply the rate limiting middleware to API calls only
    app.use('/api/', apiLimiter);



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
        // Exclude orphan networks (those with 0 dBm signal have no real observations)
        const totalNetworksQuery = `
          SELECT COUNT(*)
          FROM app.networks_legacy
          WHERE bestlevel != 0
        `;
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

        // New queries for radio types (exclude orphans)
        const wifiCountQuery = "SELECT COUNT(*) FROM app.networks_legacy WHERE type = 'W' AND bestlevel != 0";
        const bleCountQuery = "SELECT COUNT(*) FROM app.networks_legacy WHERE type = 'E' AND bestlevel != 0";
        const btCountQuery = "SELECT COUNT(*) FROM app.networks_legacy WHERE type = 'B' AND bestlevel != 0";
        const lteCountQuery = "SELECT COUNT(*) FROM app.networks_legacy WHERE type = 'L' AND bestlevel != 0";
        const gsmCountQuery = "SELECT COUNT(*) FROM app.networks_legacy WHERE type = 'G' AND bestlevel != 0";

        const [
          totalNetworksRes,
          threatsRes,
          suspiciousRes,
          enrichedRes,
          wifiCountRes,
          bleCountRes,
          btCountRes,
          lteCountRes,
          gsmCountRes
        ] = await Promise.all([
          query(totalNetworksQuery),
          query(threatsQuery, [MIN_VALID_TIMESTAMP]),
          query(suspiciousQuery),
          query(enrichedQuery),
          query(wifiCountQuery),
          query(bleCountQuery),
          query(btCountQuery),
          query(lteCountQuery),
          query(gsmCountQuery)
        ]);

        const metrics = {
          totalNetworks: parseInt(totalNetworksRes.rows[0].count),
          threatsCount: parseInt(threatsRes.rows[0].count),
          surveillanceCount: parseInt(suspiciousRes.rows[0].count),
          enrichedCount: parseInt(enrichedRes.rows[0].count),
          wifiCount: parseInt(wifiCountRes.rows[0].count),
          bleCount: parseInt(bleCountRes.rows[0].count),
          btCount: parseInt(btCountRes.rows[0].count),
          lteCount: parseInt(lteCountRes.rows[0].count),
          gsmCount: parseInt(gsmCountRes.rows[0].count),
        };

        res.json(metrics);
      } catch (err) {
        next(err);
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
        next(err);
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
        next(err);
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
        next(err);
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
        next(err);
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
        next(err);
      }
    });

    // API endpoint for quick threat detection with pagination
    app.get('/api/threats/quick', async (req, res, next) => {
      try {
        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit);
        const minSeverity = req.query.minSeverity ? parseInt(req.query.minSeverity) : null;

        if (isNaN(page) || page <= 0) {
          return res.status(400).json({ error: 'Invalid page parameter. Must be a positive integer.' });
        }
        if (isNaN(limit) || limit <= 0) {
          return res.status(400).json({ error: 'Invalid limit parameter. Must be a positive integer.' });
        }
        if (minSeverity !== null && (isNaN(minSeverity) || minSeverity < 0 || minSeverity > 100)) {
          return res.status(400).json({ error: 'minSeverity must be a number between 0 and 100.' });
        }
        
        const offset = (page - 1) * limit;

        const queryParams = [MIN_VALID_TIMESTAMP];
        let paramIndex = 2; // Starting index for dynamic parameters

        let whereClauses = [];

        // Base threat score condition
        let threatScoreCalculation = `
            COALESCE(nt.threat_score * 100, (
              CASE WHEN ns.seen_at_home AND ns.seen_away_from_home THEN 40 ELSE 0 END +
              CASE WHEN ns.max_distance_from_home_km - ns.min_distance_from_home_km > 0.2 THEN 25 ELSE 0 END +
              CASE WHEN ns.unique_days >= 7 THEN 15 WHEN ns.unique_days >= 3 THEN 10 WHEN ns.unique_days >= 2 THEN 5 ELSE 0 END +
              CASE WHEN ns.observation_count >= 50 THEN 10 WHEN ns.observation_count >= 20 THEN 5 ELSE 0 END
            ))`;
        
        whereClauses.push(`${threatScoreCalculation} >= 30`);

        // Filter by minSeverity if provided
        if (minSeverity !== null) {
          whereClauses.push(`${threatScoreCalculation} >= $${paramIndex++}`);
          queryParams.push(minSeverity);
        }

        // Filter out cellular networks (GSM, LTE, 5G) unless they have >5km distance range
        whereClauses.push(`
          (
            ns.type NOT IN ('G', 'L', 'N')
            OR (ns.max_distance_from_home_km - ns.min_distance_from_home_km) > 5
          )
        `);

        // Construct the full WHERE clause
        const fullWhereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Add limit and offset parameters
        queryParams.push(limit, offset);

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
            COALESCE(nt.threat_score * 100, (
              CASE WHEN ns.seen_at_home AND ns.seen_away_from_home THEN 40 ELSE 0 END +
              CASE WHEN ns.max_distance_from_home_km - ns.min_distance_from_home_km > 0.2 THEN 25 ELSE 0 END +
              CASE WHEN ns.unique_days >= 7 THEN 15 WHEN ns.unique_days >= 3 THEN 10 WHEN ns.unique_days >= 2 THEN 5 ELSE 0 END +
              CASE WHEN ns.observation_count >= 50 THEN 10 WHEN ns.observation_count >= 20 THEN 5 ELSE 0 END
            )) as threat_score,
            CASE
              WHEN nt.tag_type = 'THREAT' THEN 'User Tagged Threat'
              WHEN nt.tag_type = 'INVESTIGATE' THEN 'User Tagged Investigate'
              WHEN nt.tag_type = 'FALSE_POSITIVE' THEN 'User Tagged False Positive'
              WHEN ns.seen_at_home AND ns.seen_away_from_home THEN 'Potential Tracking Device'
              WHEN ns.max_distance_from_home_km - ns.min_distance_from_home_km > 1 THEN 'Mobile Device Pattern'
              ELSE 'Movement Detected'
            END as threat_type,
            -- Include user tags and ML threat scores
            nt.tag_type as user_tag,
            nt.threat_score as user_threat_score,
            COALESCE(nt.ml_confidence, (CASE
              WHEN ns.observation_count >= 10 THEN 0.9
              WHEN ns.observation_count >= 5 THEN 0.7
              ELSE 0.4
            END)) as ml_confidence,
            nt.confidence as user_confidence,
            nt.notes as user_notes,
            nt.user_override,
            -- Add total count using window function
            COUNT(*) OVER() as total_count
          FROM network_stats ns
          LEFT JOIN app.network_tags nt ON ns.bssid = nt.bssid
          ${fullWhereClause}
          ORDER BY
            ns.max_distance_from_home_km DESC,
            threat_score DESC,
            ns.unique_days DESC,
            ns.observation_count DESC
          LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `, queryParams);

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
            confidence: (row.ml_confidence * 100).toFixed(0),
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
        next(err);
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
              ta.*,
              nt.tag_type as user_tag,
              nt.confidence as user_confidence,
              nt.notes as user_notes,
              nt.user_override,
              -- Threat Score Calculation (0-100)
              COALESCE(nt.threat_score * 100, (
                -- High threat: Seen at home AND away (possible tracking device)
                CASE WHEN ta.seen_at_home AND ta.seen_away_from_home THEN 40 ELSE 0 END +

                -- Medium threat: Multiple distant observations beyond WiFi range (200m)
                CASE WHEN ta.max_distance_between_obs_km > 0.2 THEN 25 ELSE 0 END +

                -- High threat: Rapid movement (>50 km/h suggests vehicle tracking)
                CASE
                  WHEN ta.max_speed_kmh > 100 THEN 20  -- Very fast movement
                  WHEN ta.max_speed_kmh > 50 THEN 15   -- Highway speed
                  WHEN ta.max_speed_kmh > 20 THEN 10   -- City driving
                  ELSE 0
                END +

                -- Medium threat: Observed over multiple days (persistent tracking)
                CASE
                  WHEN ta.unique_days_observed >= 7 THEN 15
                  WHEN ta.unique_days_observed >= 3 THEN 10
                  WHEN ta.unique_days_observed >= 2 THEN 5
                  ELSE 0
                END +

                -- Low threat: Many observations (could be legitimate or surveillance)
                CASE
                  WHEN ta.total_observations >= 50 THEN 10
                  WHEN ta.total_observations >= 20 THEN 5
                  ELSE 0
                END
              )) as threat_score,

              -- Threat Type Classification
              CASE
                WHEN nt.tag_type = 'THREAT' THEN 'User Tagged Threat'
                WHEN nt.tag_type = 'INVESTIGATE' THEN 'User Tagged Investigate'
                WHEN nt.tag_type = 'FALSE_POSITIVE' THEN 'User Tagged False Positive'
                WHEN ta.seen_at_home AND ta.seen_away_from_home AND ta.max_speed_kmh > 20 THEN 'Mobile Tracking Device'
                WHEN ta.seen_at_home AND ta.seen_away_from_home THEN 'Potential Stalking Device'
                WHEN ta.max_distance_between_obs_km > 1 AND ta.unique_days_observed > 1 THEN 'Following Pattern Detected'
                WHEN ta.max_speed_kmh > 100 THEN 'High-Speed Vehicle Tracker'
                WHEN NOT ta.seen_at_home AND ta.max_distance_between_obs_km > 0.5 THEN 'Mobile Device (Non-Home)'
                ELSE 'Low Risk Movement'
              END as threat_type,

              -- Confidence Level
              COALESCE(nt.ml_confidence, (CASE
                WHEN ta.total_observations >= 10 AND ta.unique_days_observed >= 3 THEN 0.9
                WHEN ta.total_observations >= 5 THEN 0.7
                ELSE 0.4
              END)) as confidence

            FROM threat_analysis ta
            LEFT JOIN app.network_tags nt ON ta.bssid = nt.bssid
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
            distances_from_home_km,
            user_tag,
            user_confidence,
            user_notes,
            user_override
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
            confidence: (row.confidence * 100).toFixed(0),
            patterns: {
              seenAtHome: row.seen_at_home,
              seenAwayFromHome: row.seen_away_from_home,
              maxDistanceBetweenObsKm: parseFloat(row.max_distance_between_obs_km),
              observationTimespanMs: row.observation_timespan_ms,
              uniqueDaysObserved: row.unique_days_observed,
              maxSpeedKmh: parseFloat(row.max_speed_kmh),
              distancesFromHomeKm: row.distances_from_home_km
            },
            userTag: row.user_tag,
            userConfidence: row.user_confidence,
            userNotes: row.user_notes,
            userOverride: row.user_override
          }))
        });
      } catch (err) {
        next(err);
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
        next(err);
      }
    });

    // API endpoint to tag a network
    app.post('/api/tag-network', async (req, res, next) => {
      try {
        const { bssid, tag_type, confidence, notes } = req.body;

        // Validate bssid
        if (!bssid || !/^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/i.test(bssid)) {
          return res.status(400).json({ error: 'Valid BSSID is required (e.g., AA:BB:CC:DD:EE:FF)' });
        }

        // Validate tag_type
        const validTagTypes = ['LEGIT', 'FALSE_POSITIVE', 'INVESTIGATE', 'THREAT'];
        if (!tag_type || !validTagTypes.includes(tag_type.toUpperCase())) {
          return res.status(400).json({ error: `Valid tag_type is required (one of: ${validTagTypes.join(', ')})` });
        }

        // Validate confidence
        const parsedConfidence = parseFloat(confidence);
        if (isNaN(parsedConfidence) || parsedConfidence < 0 || parsedConfidence > 100) {
          return res.status(400).json({ error: 'Confidence must be a number between 0 and 100' });
        }

        // Validate notes
        if (notes !== undefined && typeof notes !== 'string') {
          return res.status(400).json({ error: 'Notes must be a string' });
        }

        // Get SSID from networks table if available
        const networkResult = await query(`
          SELECT ssid FROM app.networks_legacy WHERE bssid = $1 LIMIT 1
        `, [bssid.toUpperCase()]);

        const ssid = networkResult.rows.length > 0 ? networkResult.rows[0].ssid : null;

        // Delete any existing tags for this BSSID (ensure only one tag per network)
        await query(`
          DELETE FROM app.network_tags WHERE bssid = $1
        `, [bssid.toUpperCase()]);

        // Insert the new tag
        const result = await query(`
          INSERT INTO app.network_tags (bssid, ssid, tag_type, confidence, notes)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, bssid, tag_type, confidence, threat_score, ml_confidence
        `, [bssid.toUpperCase(), ssid, tag_type.toUpperCase(), parsedConfidence / 100.0, notes || null]);

        res.json({
          ok: true,
          tag: result.rows[0]
        });
      } catch (err) {
        next(err);
      }
    });

    // API endpoint to get tagged networks by tag type
    app.get('/api/networks/tagged', async (req, res, next) => {
      try {
        const { tag_type } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;

        // Validate tag_type
        const validTagTypes = ['LEGIT', 'FALSE_POSITIVE', 'INVESTIGATE', 'THREAT'];
        if (!tag_type || !validTagTypes.includes(tag_type.toUpperCase())) {
          return res.status(400).json({ error: `Valid tag_type is required (one of: ${validTagTypes.join(', ')})` });
        }

        // Validate pagination
        if (page <= 0) {
          return res.status(400).json({ error: 'Invalid page parameter. Must be a positive integer.' });
        }
        if (limit <= 0 || limit > 1000) {
          return res.status(400).json({ error: 'Invalid limit parameter. Must be between 1 and 1000.' });
        }

        const offset = (page - 1) * limit;

        // Query networks with the specified tag with pagination
        const result = await query(`
          SELECT
            nt.bssid,
            nt.ssid,
            nt.tag_type,
            nt.confidence,
            nt.notes,
            nt.tagged_at,
            nt.threat_score,
            nt.final_threat_score,
            n.type,
            n.bestlevel,
            n.last_seen,
            COUNT(l.unified_id) as observation_count,
            MIN(l.time) as first_seen,
            MAX(l.time) as last_seen,
            (MAX(l.time) - MIN(l.time)) as observation_timespan_ms,
            COUNT(*) OVER() as total_count
          FROM app.network_tags nt
          LEFT JOIN app.networks_legacy n ON nt.bssid = n.bssid
          LEFT JOIN app.locations_legacy l ON nt.bssid = l.bssid
          WHERE nt.tag_type = $1
          GROUP BY nt.bssid, nt.ssid, nt.tag_type, nt.confidence, nt.notes, nt.tagged_at, nt.threat_score, nt.final_threat_score, n.type, n.bestlevel, n.last_seen
          ORDER BY nt.tagged_at DESC
          LIMIT $2 OFFSET $3
        `, [tag_type.toUpperCase(), limit, offset]);

        const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

        res.json({
          ok: true,
          networks: result.rows,
          totalCount,
          page,
          limit
        });
      } catch (err) {
        next(err);
      }
    });

    // API endpoint to delete a network tag (untag)
    app.delete('/api/tag-network/:bssid', async (req, res, next) => {
      try {
        const { bssid } = req.params;

        // Validate bssid
        if (!bssid || !/^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/i.test(bssid)) {
          return res.status(400).json({ error: 'Valid BSSID is required (e.g., AA:BB:CC:DD:EE:FF)' });
        }

        // Delete all tags for this BSSID
        const result = await query(`
          DELETE FROM app.network_tags
          WHERE bssid = $1
          RETURNING bssid, tag_type
        `, [bssid.toUpperCase()]);

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'No tags found for this BSSID' });
        }

        res.json({
          ok: true,
          removed: result.rows
        });
      } catch (err) {
        next(err);
      }
    });

    // API endpoint to get manufacturer from BSSID
    app.get('/api/manufacturer/:bssid', async (req, res) => {
      try {
        const { bssid } = req.params;

        // Validate bssid
        if (!bssid || !/^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/i.test(bssid)) {
          return res.status(400).json({ error: 'Valid BSSID is required (e.g., AA:BB:CC:DD:EE:FF)' });
        }


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
        next(err);
      }
    });

    // API endpoint to get networks with location data
    app.get('/api/networks', async (req, res, next) => {
      try {
        // Pagination parameters
        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit);

        if (isNaN(page) || page <= 0) {
          return res.status(400).json({ error: 'Invalid page parameter. Must be a positive integer.' });
        }
        if (isNaN(limit) || limit <= 0) {
          return res.status(400).json({ error: 'Invalid limit parameter. Must be a positive integer.' });
        }
        
        const offset = (page - 1) * limit;

        // Filter parameters
        const search = req.query.search || '';
        const type = req.query.type || '';
        const security = req.query.security || '';
        const minSignal = req.query.minSignal ? parseInt(req.query.minSignal) : null;
        const maxSignal = req.query.maxSignal ? parseInt(req.query.maxSignal) : null;

        // Validate filter parameters if they are present
        if (search && typeof search !== 'string') {
          return res.status(400).json({ error: 'Search parameter must be a string.' });
        }
        if (type && typeof type !== 'string') {
          return res.status(400).json({ error: 'Type parameter must be a string.' });
        }
        if (security && typeof security !== 'string') {
          return res.status(400).json({ error: 'Security parameter must be a string.' });
        }
        if (minSignal !== null && (isNaN(minSignal) || typeof minSignal !== 'number')) {
          return res.status(400).json({ error: 'minSignal parameter must be a number.' });
        }
        if (maxSignal !== null && (isNaN(maxSignal) || typeof maxSignal !== 'number')) {
          return res.status(400).json({ error: 'maxSignal parameter must be a number.' });
        }

        // Sorting parameters
        const sort = req.query.sort || 'lastSeen'; // Default sort column
        const order = (req.query.order || 'DESC').toUpperCase();   // Default sort order

        // Map frontend sort columns to database fields
        const sortColumnMap = {
          type: 'n.type',
          ssid: 'n.ssid',
          bssid: 'n.bssid',
          signal: 'COALESCE(l.level, n.bestlevel)',
          security: 'n.encryption',
          frequency: 'n.frequency',
          channel: 'n.channel',
          observations: 'COALESCE(oc.obs_count, 1)',
          latitude: 'COALESCE(l.lat, n.bestlat, n.lastlat, n.trilaterated_lat)',
          longitude: 'COALESCE(l.lon, n.bestlon, n.lastlon, n.trilaterated_lon)',
          distanceFromHome: 'distance_from_home', // Alias from subquery
          accuracy: 'COALESCE(l.accuracy, 0)',
          lastSeen: 'lastseen',
        };

        // Validate sort column
        if (!sortColumnMap[sort]) {
          return res.status(400).json({ error: `Invalid sort column: ${sort}. Allowed: ${Object.keys(sortColumnMap).join(', ')}` });
        }

        // Validate sort order
        if (!['ASC', 'DESC'].includes(order)) {
          return res.status(400).json({ error: 'Invalid sort order. Must be ASC or DESC.' });
        }

        const orderByClause = sort === 'lastSeen' ? `${sortColumnMap[sort]} ${order} NULLS LAST` : `${sortColumnMap[sort]} ${order}`;

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

        // Base query with filtering and sorting applied before pagination
        let queryText = `
          WITH latest_locations AS (
            SELECT DISTINCT ON (bssid)
              bssid, lat, lon, level, accuracy, time
            FROM app.locations_legacy
            WHERE lat IS NOT NULL AND lon IS NOT NULL AND time >= $1
            ORDER BY bssid, time DESC
          ),
          latest_times AS (
            SELECT DISTINCT ON (bssid)
              bssid, time as last_time
            FROM app.locations_legacy
            WHERE time IS NOT NULL
            ORDER BY bssid, time DESC
          ),
          observation_counts AS (
            SELECT bssid, COUNT(*) as obs_count
            FROM app.locations_legacy
            WHERE time >= $1
            GROUP BY bssid
          )
          SELECT
            n.unified_id, n.ssid, n.bssid, n.type,
            -- Parse security from capabilities field
            CASE
              -- Bluetooth/BLE use different security models
              WHEN n.type IN ('B', 'E') THEN 'N/A'
              -- WiFi security parsing
              WHEN UPPER(n.capabilities) LIKE '%WPA3%' OR UPPER(n.capabilities) LIKE '%SAE%' THEN
                CASE WHEN UPPER(n.capabilities) LIKE '%EAP%' OR UPPER(n.capabilities) LIKE '%MGT%' THEN 'WPA3-E' ELSE 'WPA3-P' END
              WHEN UPPER(n.capabilities) LIKE '%WPA2%' OR UPPER(n.capabilities) LIKE '%RSN%' THEN
                CASE WHEN UPPER(n.capabilities) LIKE '%EAP%' OR UPPER(n.capabilities) LIKE '%MGT%' THEN 'WPA2-E' ELSE 'WPA2-P' END
              WHEN UPPER(n.capabilities) LIKE '%WPA-%' AND UPPER(n.capabilities) NOT LIKE '%WPA2%' THEN 'WPA'
              WHEN UPPER(n.capabilities) LIKE '%WEP%' OR LOWER(n.encryption) = 'wep' THEN 'WEP'
              WHEN UPPER(n.capabilities) LIKE '%WPS%' AND UPPER(n.capabilities) NOT LIKE '%WPA%' THEN 'WPS'
              WHEN LOWER(n.encryption) = 'wpa3' THEN 'WPA3-P'
              WHEN LOWER(n.encryption) = 'wpa2' THEN 'WPA2-P'
              WHEN LOWER(n.encryption) = 'wpa' THEN 'WPA'
              WHEN n.capabilities IS NOT NULL AND n.capabilities != '' AND n.capabilities != 'Misc' AND n.capabilities != 'Uncategorized;10' THEN 'Unknown'
              ELSE 'OPEN'
            END as security,
            n.frequency, n.channel,
            CASE
              WHEN COALESCE(l.level, n.bestlevel, 0) = 0 THEN NULL
              ELSE COALESCE(l.level, n.bestlevel)
            END as signal,
            COALESCE(l.accuracy, 0) as accuracy,
            COALESCE(lt.last_time, l.time, n.lasttime) as lastseen,
            COALESCE(l.lat, n.bestlat, n.lastlat, n.trilaterated_lat) as lat,
            COALESCE(l.lon, n.bestlon, n.lastlon, n.trilaterated_lon) as lng,
            COALESCE(oc.obs_count, 1) as observations, n.capabilities as misc,
            rm.organization_name as manufacturer,
            CASE
              WHEN COALESCE(l.level, n.bestlevel, -999) = 0 OR COALESCE(l.level, n.bestlevel) IS NULL THEN 'safe'
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
            END as distance_from_home,
            COUNT(*) OVER() as total_networks_count -- Total count before LIMIT/OFFSET
          FROM app.networks_legacy n
          LEFT JOIN latest_locations l ON n.bssid = l.bssid
          LEFT JOIN latest_times lt ON n.bssid = lt.bssid
          LEFT JOIN observation_counts oc ON n.bssid = oc.bssid
          LEFT JOIN app.radio_manufacturers rm ON UPPER(REPLACE(SUBSTRING(n.bssid, 1, 8), ':', '')) = rm.oui_prefix_24bit
        `;

        // Parameters for the query
        const params = [
          MIN_VALID_TIMESTAMP,
          home?.lat || null,
          home?.lon || null,
        ];

        // WHERE clauses
        const whereClauses = [
          "n.bssid IS NOT NULL",
          "(n.lasttime IS NULL OR n.lasttime >= $1)",
          "n.bestlevel != 0" // Exclude orphans (those with 0 dBm have no real observations)
        ];

        if (search) {
          params.push(`%${search.toLowerCase()}%`);
          whereClauses.push(`(LOWER(n.ssid) LIKE $${params.length} OR LOWER(n.bssid) LIKE $${params.length})`);
        }
        if (type) {
          params.push(type);
          whereClauses.push(`n.type = $${params.length}`);
        }
        if (security) {
          params.push(`%${security.toLowerCase()}%`);
          whereClauses.push(`LOWER(n.encryption) LIKE $${params.length}`);
        }
        if (minSignal !== null) {
          params.push(minSignal);
          whereClauses.push(`COALESCE(l.level, n.bestlevel) >= $${params.length}`);
        }
        if (maxSignal !== null) {
          params.push(maxSignal);
          whereClauses.push(`COALESCE(l.level, n.bestlevel) <= $${params.length}`);
        }

        if (whereClauses.length > 0) {
          queryText += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        // Add ordering, pagination
        queryText += ` ORDER BY ${orderByClause} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        
        // Join networks_legacy with locations_legacy to get the latest location data
        const { rows } = await query(queryText, params);

        const totalCount = rows.length > 0 ? parseInt(rows[0].total_networks_count) : 0;

        const networks = rows.map(row => {
          // Debug: log first row
          if (rows.indexOf(row) === 0) {
            console.log('First row keys:', Object.keys(row));
            console.log('First row lastseen:', row.lastseen);
          }
          return {
            id: row.unified_id,
            ssid: row.ssid,
            bssid: row.bssid,
            type: row.type || 'W',
            security: row.security,
            capabilities: row.misc,
            encryption: row.security,
            frequency: row.frequency ? parseFloat(row.frequency) / 1000 : null,
            channel: row.channel ? parseInt(row.channel) : null,
            signal: row.signal ? parseInt(row.signal) : null,
            accuracy: row.accuracy ? parseFloat(row.accuracy) : 0,
            observations: row.observations ? parseInt(row.observations) : 1,
            manufacturer: row.manufacturer || 'Unknown',
            lastSeen: row.lastseen ? parseInt(row.lastseen) : null,
            timestamp: row.lastseen ? parseInt(row.lastseen) : null,
            time: row.lastseen ? parseInt(row.lastseen) : null,
            status: row.status,
            distanceFromHome: row.distance_from_home ? parseFloat(row.distance_from_home) : null,
            latitude: row.lat ? parseFloat(row.lat) : null,
            longitude: row.lng ? parseFloat(row.lng) : null,
            misc: row.misc,
            location: {
              lat: row.lat ? parseFloat(row.lat) : null,
              lng: row.lng ? parseFloat(row.lng) : null,
            },
          };
        });

        res.json({
          networks,
          totalCount,
          page,
          limit
        });
      } catch (err) {
        next(err);
      }
    });

    // API endpoint to search for networks by SSID
    app.get('/api/networks/search/:ssid', async (req, res) => {
      try {
        const { ssid } = req.params;

        // Validate ssid
        if (!ssid || typeof ssid !== 'string' || ssid.trim() === '') {
          return res.status(400).json({ error: 'SSID parameter is required and cannot be empty.' });
        }
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
        next(err);
      }
    });

    // Centralized error handling middleware
    app.use(errorHandler);

    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });

} catch (err) {
    console.error('Server startup error:', err);
}
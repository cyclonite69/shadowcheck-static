-- Fix MV to Exclude Quality-Filtered Observations
-- Purpose: Apply quality filters to all observation queries in api_network_explorer_mv
-- Impact: Will reduce observation counts by ~10% and fix max_distance for stationary networks

\timing on

SELECT 'Fixing api_network_explorer_mv to exclude quality-filtered observations' AS status;

-- Drop and recreate the MV with quality filters
DROP MATERIALIZED VIEW IF EXISTS app.api_network_explorer_mv CASCADE;

CREATE MATERIALIZED VIEW app.api_network_explorer_mv AS
WITH stationary_analysis AS (
    SELECT
        bssid,
        CASE
            WHEN COUNT(*) < 5 THEN NULL
            WHEN MAX(ST_Distance(
                ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
                (SELECT ST_SetSRID(ST_MakePoint(lm.longitude, lm.latitude), 4326)::geography
                 FROM app.location_markers lm WHERE lm.marker_type = 'home' LIMIT 1)
            )) < 100 THEN 0.95
            WHEN MAX(ST_Distance(
                ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
                (SELECT ST_SetSRID(ST_MakePoint(lm.longitude, lm.latitude), 4326)::geography
                 FROM app.location_markers lm WHERE lm.marker_type = 'home' LIMIT 1)
            )) < 500 THEN 0.70
            WHEN MAX(ST_Distance(
                ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
                (SELECT ST_SetSRID(ST_MakePoint(lm.longitude, lm.latitude), 4326)::geography
                 FROM app.location_markers lm WHERE lm.marker_type = 'home' LIMIT 1)
            )) < 1000 THEN 0.30
            ELSE 0.05
        END AS stationary_confidence
    FROM app.observations
    WHERE lat IS NOT NULL
      AND lon IS NOT NULL
      AND (is_quality_filtered = false OR is_quality_filtered IS NULL)
    GROUP BY bssid
)
SELECT n.bssid, n.ssid, n.type, n.frequency,
    n.bestlevel AS signal,
    -- Lat/lon: furthest quality observation from home
    (SELECT o.lat FROM app.observations o
     WHERE o.bssid = n.bssid 
     AND o.lat IS NOT NULL AND o.lon IS NOT NULL
     AND (o.is_quality_filtered = false OR o.is_quality_filtered IS NULL)
     ORDER BY ST_Distance(
         ST_SetSRID(ST_MakePoint(o.lon, o.lat), 4326)::geography,
         (SELECT ST_SetSRID(ST_MakePoint(lm.longitude, lm.latitude), 4326)::geography
          FROM app.location_markers lm WHERE lm.marker_type = 'home' LIMIT 1)
     ) DESC LIMIT 1) AS lat,
    (SELECT o.lon FROM app.observations o
     WHERE o.bssid = n.bssid 
     AND o.lat IS NOT NULL AND o.lon IS NOT NULL
     AND (o.is_quality_filtered = false OR o.is_quality_filtered IS NULL)
     ORDER BY ST_Distance(
         ST_SetSRID(ST_MakePoint(o.lon, o.lat), 4326)::geography,
         (SELECT ST_SetSRID(ST_MakePoint(lm.longitude, lm.latitude), 4326)::geography
          FROM app.location_markers lm WHERE lm.marker_type = 'home' LIMIT 1)
     ) DESC LIMIT 1) AS lon,
    to_timestamp((n.lasttime_ms::numeric / 1000.0)::double precision) AS observed_at,
    n.capabilities AS security,
    COALESCE(t.threat_tag, 'untagged'::character varying) AS tag_type,
    count(o.id) AS observations,
    count(DISTINCT date(o.time)) AS unique_days,
    count(DISTINCT (round(o.lat::numeric, 3) || ',' || round(o.lon::numeric, 3))) AS unique_locations,
    max(o.accuracy) AS accuracy_meters,
    min(o.time) AS first_seen,
    max(o.time) AS last_seen,
    COALESCE(ts.final_threat_score, 0::numeric) AS threat_score,
    COALESCE(ts.final_threat_level, 'NONE'::character varying) AS threat_level,
    ts.model_version,
    -- Distance from home
    COALESCE((ST_Distance(
        (SELECT ST_SetSRID(ST_MakePoint(o.lon, o.lat), 4326)::geography
         FROM app.observations o
         WHERE o.bssid = n.bssid 
         AND o.lat IS NOT NULL AND o.lon IS NOT NULL
         AND (o.is_quality_filtered = false OR o.is_quality_filtered IS NULL)
         ORDER BY ST_Distance(
             ST_SetSRID(ST_MakePoint(o.lon, o.lat), 4326)::geography,
             (SELECT ST_SetSRID(ST_MakePoint(lm.longitude, lm.latitude), 4326)::geography
              FROM app.location_markers lm WHERE lm.marker_type = 'home' LIMIT 1)
         ) DESC LIMIT 1),
        (SELECT ST_SetSRID(ST_MakePoint(lm.longitude, lm.latitude), 4326)::geography
         FROM app.location_markers lm WHERE lm.marker_type = 'home' LIMIT 1)
    ) / 1000.0), 0::double precision) AS distance_from_home_km,
    -- Max distance between quality observations only
    (SELECT MAX(ST_Distance(
        ST_SetSRID(ST_MakePoint(o1.lon, o1.lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(o2.lon, o2.lat), 4326)::geography
    ))
    FROM app.observations o1, app.observations o2
    WHERE o1.bssid = n.bssid AND o2.bssid = n.bssid
      AND o1.lat IS NOT NULL AND o1.lon IS NOT NULL
      AND o2.lat IS NOT NULL AND o2.lon IS NOT NULL
      AND (o1.is_quality_filtered = false OR o1.is_quality_filtered IS NULL)
      AND (o2.is_quality_filtered = false OR o2.is_quality_filtered IS NULL)) AS max_distance_meters,
    -- Manufacturer from radio_manufacturers
    rm.manufacturer,
    s.stationary_confidence
FROM app.networks n
LEFT JOIN app.network_tags t ON n.bssid = t.bssid::text
LEFT JOIN app.observations o ON n.bssid = o.bssid
LEFT JOIN app.network_threat_scores ts ON n.bssid = ts.bssid::text
LEFT JOIN LATERAL (
    SELECT r.manufacturer
    FROM app.radio_manufacturers r
    WHERE UPPER(REPLACE(SUBSTRING(n.bssid, 1, 8), ':', ''))
          IN (r.oui, r.oui_assignment_hex, r.prefix_24bit)
    LIMIT 1
) rm ON true
LEFT JOIN stationary_analysis s ON n.bssid = s.bssid
WHERE o.lat IS NOT NULL 
AND o.lon IS NOT NULL
AND (o.is_quality_filtered = false OR o.is_quality_filtered IS NULL)
GROUP BY n.bssid, n.ssid, n.type, n.frequency, n.bestlevel,
         n.lasttime_ms, n.capabilities, t.threat_tag, 
         ts.final_threat_score, ts.final_threat_level, ts.model_version,
         rm.manufacturer, s.stationary_confidence;

-- Recreate indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_network_explorer_mv_bssid ON app.api_network_explorer_mv(bssid);
CREATE INDEX IF NOT EXISTS idx_api_network_explorer_mv_type ON app.api_network_explorer_mv(type);
CREATE INDEX IF NOT EXISTS idx_api_network_explorer_mv_observed_at ON app.api_network_explorer_mv(observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_network_explorer_mv_threat ON app.api_network_explorer_mv(threat_score DESC);
CREATE INDEX IF NOT EXISTS idx_api_network_explorer_mv_manufacturer_gin ON app.api_network_explorer_mv (manufacturer);
CREATE INDEX IF NOT EXISTS idx_api_network_explorer_mv_stationary ON app.api_network_explorer_mv(stationary_confidence) WHERE stationary_confidence IS NOT NULL;

SELECT 'MV definition updated - now run: REFRESH MATERIALIZED VIEW CONCURRENTLY app.api_network_explorer_mv;' AS next_step;

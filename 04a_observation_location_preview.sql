-- Phase 4A: Observation → Location Preview (READ-ONLY)
-- Shows what matches will be made WITHOUT writing anything

\echo 'Phase 4A: Observation → Location Matching Preview'
\echo '=================================================='
\echo ''

-- Create temp table to hold match results
DROP TABLE IF EXISTS temp_best_matches;

CREATE TEMP TABLE temp_best_matches AS
WITH params AS (
  SELECT 2000::bigint AS max_delta_ms
),

valid_locations AS (
  SELECT *
  FROM staging_locations_all_raw
  WHERE location_at_ms > 0  -- Filter invalid timestamps
),

candidate_matches AS (
  SELECT
    o.id AS observation_id,
    o.device_id,
    o.observed_at_ms,

    l.location_id,
    l.location_at_ms,
    ABS(o.observed_at_ms - l.location_at_ms) AS delta_ms,

    l.lat,
    l.lon,
    l.altitude,
    NULL::double precision AS speed  -- Placeholder for future speed calculation
  FROM observations o
  JOIN valid_locations l
    ON l.device_id = o.device_id
),

ranked_matches AS (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY observation_id
      ORDER BY
        delta_ms ASC,
        location_at_ms ASC  -- Deterministic tie-break: earlier timestamp
    ) AS rn
  FROM candidate_matches
)

SELECT
  observation_id,
  device_id,
  observed_at_ms,
  location_id,
  location_at_ms,
  delta_ms,
  lat,
  lon,
  altitude,
  speed
FROM ranked_matches, params
WHERE rn = 1
  AND delta_ms <= params.max_delta_ms;

\echo 'Match data computed'
\echo ''

-- Summary Statistics
SELECT
  'SUMMARY' AS section,
  COUNT(DISTINCT o.id) AS total_observations,
  COUNT(DISTINCT bm.observation_id) AS matched_observations,
  COUNT(DISTINCT o.id) - COUNT(DISTINCT bm.observation_id) AS unmatched_observations,
  ROUND(100.0 * COUNT(DISTINCT bm.observation_id) / NULLIF(COUNT(DISTINCT o.id), 0), 2) AS match_percentage
FROM observations o
LEFT JOIN temp_best_matches bm ON bm.observation_id = o.id;

\echo ''
\echo 'Delta Distribution (ms):'

-- Delta distribution histogram
SELECT
  CASE
    WHEN delta_ms <= 100 THEN '0-100ms'
    WHEN delta_ms <= 500 THEN '101-500ms'
    WHEN delta_ms <= 1000 THEN '501-1000ms'
    WHEN delta_ms <= 2000 THEN '1001-2000ms'
    ELSE '>2000ms'
  END AS delta_bucket,
  COUNT(*) AS count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM temp_best_matches
GROUP BY delta_bucket
ORDER BY MIN(delta_ms);

\echo ''
\echo 'Sample Matches (first 10):'

-- Sample matched observations
SELECT
  observation_id,
  device_id,
  to_timestamp(observed_at_ms / 1000.0) AS observed_at,
  to_timestamp(location_at_ms / 1000.0) AS location_at,
  delta_ms,
  ROUND(lat::numeric, 6) AS lat,
  ROUND(lon::numeric, 6) AS lon,
  ROUND(altitude::numeric, 1) AS altitude
FROM temp_best_matches
ORDER BY observed_at_ms
LIMIT 10;

\echo ''
\echo 'Phase 4A Preview Complete - No data modified'

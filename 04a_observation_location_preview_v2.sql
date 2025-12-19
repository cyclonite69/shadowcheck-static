-- Phase 4A: Observation → GPS Fix Alignment Preview (READ-ONLY, EFFICIENT)
-- Uses LATERAL join for O(n) performance instead of O(n²)

\echo 'Phase 4A: Observation → GPS Fix Alignment Preview'
\echo '=================================================='
\echo ''
\echo 'Computing alignment (this may take a few minutes)...'
\echo ''

-- Create aligned results using efficient LATERAL join
DROP TABLE IF EXISTS temp_alignment_preview;

CREATE TEMP TABLE temp_alignment_preview AS
WITH params AS (
  SELECT 2000::bigint AS max_delta_ms
)
SELECT
  o.id AS observation_id,
  o.device_id,
  o.observed_at_ms,

  gps.location_id,
  gps.location_at_ms,
  gps.delta_ms,

  gps.lat,
  gps.lon,
  gps.altitude
FROM observations o
CROSS JOIN params p
JOIN LATERAL (
  SELECT
    location_id,
    location_at_ms,
    ABS(o.observed_at_ms - location_at_ms) AS delta_ms,
    lat,
    lon,
    altitude
  FROM staging_locations_all_raw
  WHERE device_id = o.device_id
    AND location_at_ms > 0  -- Filter invalid timestamps
    AND ABS(o.observed_at_ms - location_at_ms) <= p.max_delta_ms
  ORDER BY ABS(o.observed_at_ms - location_at_ms) ASC, location_at_ms ASC
  LIMIT 1
) gps ON true;

\echo 'Alignment computed'
\echo ''

-- Summary Statistics
\echo 'Summary Statistics:'
SELECT
  COUNT(DISTINCT o.id) AS total_observations,
  COUNT(DISTINCT a.observation_id) AS aligned_observations,
  COUNT(DISTINCT o.id) - COUNT(DISTINCT a.observation_id) AS unaligned_observations,
  ROUND(100.0 * COUNT(DISTINCT a.observation_id) / NULLIF(COUNT(DISTINCT o.id), 0), 2) AS alignment_percentage
FROM observations o
LEFT JOIN temp_alignment_preview a ON a.observation_id = o.id;

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
FROM temp_alignment_preview
GROUP BY delta_bucket
ORDER BY MIN(delta_ms);

\echo ''
\echo 'Sample Aligned Observations (first 10):'

-- Sample alignments
SELECT
  observation_id,
  device_id,
  to_timestamp(observed_at_ms / 1000.0) AS observed_at,
  to_timestamp(location_at_ms / 1000.0) AS gps_fix_at,
  delta_ms,
  ROUND(lat::numeric, 6) AS lat,
  ROUND(lon::numeric, 6) AS lon,
  ROUND(altitude::numeric, 1) AS altitude
FROM temp_alignment_preview
ORDER BY observed_at_ms
LIMIT 10;

\echo ''
\echo 'Phase 4A Preview Complete - No data modified'
\echo 'Ready to proceed with Phase 4C if results look correct'

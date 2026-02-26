-- Add quality filter columns to observations table
ALTER TABLE observations 
  ADD COLUMN IF NOT EXISTS is_temporal_cluster BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_duplicate_coord BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_extreme_signal BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_quality_filtered BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS quality_filter_applied_at TIMESTAMP;

-- Create indexes for quality filter queries
CREATE INDEX IF NOT EXISTS idx_obs_time_lat_lon ON observations(time, lat, lon);
CREATE INDEX IF NOT EXISTS idx_obs_lat_lon ON observations(lat, lon);
CREATE INDEX IF NOT EXISTS idx_obs_quality_filtered ON observations(is_quality_filtered) WHERE is_quality_filtered = true;

-- Update materialized view to exclude quality-filtered observations
DROP MATERIALIZED VIEW IF EXISTS app.api_network_explorer_mv CASCADE;

CREATE MATERIALIZED VIEW app.api_network_explorer_mv AS
SELECT 
  n.bssid,
  n.ssid,
  n.type,
  n.security,
  n.frequency,
  n.capabilities,
  n.is_5ghz,
  n.is_6ghz,
  n.is_hidden,
  n.first_seen,
  n.last_seen,
  rm.manufacturer,
  rm.address AS manufacturer_address,
  n.min_altitude_m,
  n.max_altitude_m,
  n.altitude_span_m,
  n.max_distance_meters,
  n.last_altitude_m,
  n.is_sentinel,
  n.distance_from_home_km,
  n.observations,
  n.wigle_v3_observation_count,
  n.wigle_v3_last_import_at,
  n.first_observed_at,
  n.last_observed_at,
  n.unique_days,
  n.unique_locations,
  n.avg_signal,
  n.min_signal,
  n.max_signal,
  latest.observed_at,
  latest.signal,
  latest.lat,
  latest.lon,
  latest.accuracy_meters,
  latest.stationary_confidence,
  nt.tag_type AS threat_tag,
  nt.is_ignored,
  nt.all_tags,
  nt.notes_count,
  COALESCE(
    jsonb_build_object(
      'level', COALESCE(ts.threat_level, 'NONE'),
      'score', COALESCE(ts.threat_score::text, '0')
    ),
    jsonb_build_object('level', 'NONE', 'score', '0')
  ) AS threat,
  n.network_id
FROM networks n
LEFT JOIN radio_manufacturers rm ON n.manufacturer_oui = rm.oui
LEFT JOIN LATERAL (
  SELECT 
    time AS observed_at,
    level AS signal,
    lat,
    lon,
    accuracy_meters,
    stationary_confidence
  FROM observations o
  WHERE UPPER(o.bssid) = UPPER(n.bssid)
    AND (is_quality_filtered = false OR is_quality_filtered IS NULL)
  ORDER BY time DESC
  LIMIT 1
) latest ON true
LEFT JOIN LATERAL (
  SELECT 
    tag_type,
    is_ignored,
    string_agg(DISTINCT tag_type::text, ',') AS all_tags,
    COUNT(DISTINCT note_id) AS notes_count
  FROM network_tags_v2
  WHERE UPPER(bssid) = UPPER(n.bssid)
  GROUP BY tag_type, is_ignored
) nt ON true
LEFT JOIN LATERAL (
  SELECT 
    threat_level,
    threat_score
  FROM threat_scores
  WHERE UPPER(bssid) = UPPER(n.bssid)
  ORDER BY scored_at DESC
  LIMIT 1
) ts ON true;

CREATE INDEX idx_api_network_explorer_mv_bssid ON app.api_network_explorer_mv(bssid);
CREATE INDEX idx_api_network_explorer_mv_threat ON app.api_network_explorer_mv((threat->>'level'));

COMMENT ON MATERIALIZED VIEW app.api_network_explorer_mv IS 
'Network explorer view - excludes quality-filtered observations for accurate distance/threat calculations';

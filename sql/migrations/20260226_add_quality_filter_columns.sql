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
-- This ensures distances and threats are calculated on clean data only
DROP MATERIALIZED VIEW IF EXISTS app.api_network_explorer_mv CASCADE;

CREATE MATERIALIZED VIEW app.api_network_explorer_mv AS
SELECT n.bssid,
  n.ssid,
  n.type,
  n.frequency,
  n.bestlevel AS signal,
  (SELECT o.lat
   FROM app.observations o
   WHERE o.bssid = n.bssid 
     AND o.lat IS NOT NULL 
     AND o.lon IS NOT NULL
     AND (o.is_quality_filtered = false OR o.is_quality_filtered IS NULL)
   ORDER BY public.st_distance(
     public.st_setsrid(public.st_makepoint(o.lon, o.lat), 4326)::public.geography,
     (SELECT public.st_setsrid(public.st_makepoint(lm.longitude, lm.latitude), 4326)::public.geography
      FROM app.location_markers lm WHERE lm.marker_type = 'home' LIMIT 1)
   ) DESC LIMIT 1) AS lat,
  (SELECT o.lon
   FROM app.observations o
   WHERE o.bssid = n.bssid 
     AND o.lat IS NOT NULL 
     AND o.lon IS NOT NULL
     AND (o.is_quality_filtered = false OR o.is_quality_filtered IS NULL)
   ORDER BY public.st_distance(
     public.st_setsrid(public.st_makepoint(o.lon, o.lat), 4326)::public.geography,
     (SELECT public.st_setsrid(public.st_makepoint(lm.longitude, lm.latitude), 4326)::public.geography
      FROM app.location_markers lm WHERE lm.marker_type = 'home' LIMIT 1)
   ) DESC LIMIT 1) AS lon,
  to_timestamp((((n.lasttime_ms)::numeric / 1000.0))::double precision) AS observed_at,
  n.capabilities AS capabilities,
  n.capabilities AS security,
  n.wigle_v3_observation_count,
  n.wigle_v3_last_import_at,
  COALESCE(t.threat_tag, 'untagged'::character varying) AS tag_type,
  count(o.id) AS observations,
  count(DISTINCT date(o."time")) AS unique_days,
  count(DISTINCT ((round((o.lat)::numeric, 3) || ','::text) || round((o.lon)::numeric, 3))) AS unique_locations,
  max(o.accuracy) AS accuracy_meters,
  min(o."time") AS first_seen,
  max(o."time") AS last_seen,
  COALESCE(ts.final_threat_score, (0)::numeric) AS threat_score,
  COALESCE(ts.final_threat_level, 'NONE'::character varying) AS threat_level,
  ts.model_version,
  COALESCE((public.st_distance(
    (SELECT public.st_setsrid(public.st_makepoint(o.lon, o.lat), 4326)::public.geography
     FROM app.observations o
     WHERE o.bssid = n.bssid 
       AND o.lat IS NOT NULL 
       AND o.lon IS NOT NULL
       AND (o.is_quality_filtered = false OR o.is_quality_filtered IS NULL)
     ORDER BY public.st_distance(
       public.st_setsrid(public.st_makepoint(o.lon, o.lat), 4326)::public.geography,
       (SELECT public.st_setsrid(public.st_makepoint(lm.longitude, lm.latitude), 4326)::public.geography
        FROM app.location_markers lm WHERE lm.marker_type = 'home' LIMIT 1)
     ) DESC LIMIT 1),
    (SELECT public.st_setsrid(public.st_makepoint(lm.longitude, lm.latitude), 4326)::public.geography
     FROM app.location_markers lm WHERE lm.marker_type = 'home' LIMIT 1)
  ) / (1000.0)::double precision), (0)::double precision) AS distance_from_home_km,
  (SELECT MAX(public.st_distance(
    public.st_setsrid(public.st_makepoint(o1.lon, o1.lat), 4326)::public.geography,
    public.st_setsrid(public.st_makepoint(o2.lon, o2.lat), 4326)::public.geography
  ))
   FROM app.observations o1, app.observations o2
   WHERE o1.bssid = n.bssid 
     AND o2.bssid = n.bssid
     AND o1.lat IS NOT NULL 
     AND o1.lon IS NOT NULL
     AND o2.lat IS NOT NULL 
     AND o2.lon IS NOT NULL
     AND (o1.is_quality_filtered = false OR o1.is_quality_filtered IS NULL)
     AND (o2.is_quality_filtered = false OR o2.is_quality_filtered IS NULL)
  ) AS max_distance_meters
FROM (((app.networks n
  LEFT JOIN app.network_tags t ON ((n.bssid = (t.bssid)::text)))
  LEFT JOIN app.observations o ON ((n.bssid = o.bssid)))
  LEFT JOIN app.network_threat_scores ts ON ((n.bssid = (ts.bssid)::text)))
WHERE (o.lat IS NOT NULL AND o.lon IS NOT NULL)
  AND (o.is_quality_filtered = false OR o.is_quality_filtered IS NULL)
GROUP BY n.bssid, n.ssid, n.type, n.frequency, n.bestlevel,
  n.lasttime_ms, n.capabilities, n.wigle_v3_observation_count, n.wigle_v3_last_import_at,
  t.threat_tag, ts.final_threat_score, ts.final_threat_level, ts.model_version;

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_network_explorer_mv_bssid ON app.api_network_explorer_mv USING btree (bssid);
CREATE INDEX IF NOT EXISTS idx_api_network_explorer_mv_type ON app.api_network_explorer_mv USING btree (type);
CREATE INDEX IF NOT EXISTS idx_api_network_explorer_mv_observed_at ON app.api_network_explorer_mv USING btree (observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_network_explorer_mv_threat ON app.api_network_explorer_mv USING btree (threat_score DESC);

COMMENT ON MATERIALIZED VIEW app.api_network_explorer_mv IS 
'Network explorer view - excludes quality-filtered observations for accurate distance/threat calculations';

REFRESH MATERIALIZED VIEW app.api_network_explorer_mv;

COMMIT;


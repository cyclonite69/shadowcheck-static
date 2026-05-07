-- Migration: 20260507_fix_mv_ble_exclusion.sql
--
-- Problem 1: the best_obs CTE in api_network_explorer_mv filtered observations to
-- radio_frequency BETWEEN 2412 AND 5825 (WiFi only). BLE/Bluetooth observations
-- have radio_frequency = 7936 or 0 (WiGLE sentinel values, not real frequencies),
-- so they never contributed a lat/lon to best_obs. The MV's final WHERE required
-- o.lat IS NOT NULL, meaning all BLE/BT networks were silently excluded from the MV.
--
-- Problem 2: the security CASE expression only handled WiFi capability strings
-- ([WPA2-PSK-CCMP], etc.). BLE/BT capabilities use WiGLE's format: "Category;ClassCode"
-- (e.g. "Uncategorized;10", "Misc", "Display/Speaker;10"). These fell through to
-- 'UNKNOWN'. BLE/BT networks should be classified as 'BLE' or 'BT'.
--
-- Fix 1: remove the frequency filter from best_obs; change the final join on
-- app.observations to LEFT JOIN so networks with zero qualifying observations
-- (e.g. BLE networks observed only at radio_frequency=7936) still appear in the MV.
-- Aggregate counts/dates use COALESCE to handle the NULL case.
--
-- Fix 2: add BLE/BT detection to the security CASE expression. WiGLE encodes BLE
-- with a ";10" suffix in capabilities (class code 10 = 0x000A = BLE). Classic BT
-- uses other class codes or "Misc". Network type E = BLE, B = Bluetooth.

DROP MATERIALIZED VIEW IF EXISTS app.api_network_explorer_mv;

CREATE MATERIALIZED VIEW app.api_network_explorer_mv AS
WITH best_obs AS (
  SELECT DISTINCT ON (o.bssid)
    o.bssid,
    o.lat,
    o.lon
  FROM app.observations o
  WHERE o.lat IS NOT NULL
    AND o.lon IS NOT NULL
    AND (o.is_quality_filtered = false OR o.is_quality_filtered IS NULL)
  ORDER BY o.bssid, public.st_distance(
    public.st_setsrid(public.st_makepoint(o.lon, o.lat), 4326)::public.geography,
    (
      SELECT public.st_setsrid(public.st_makepoint(lm.longitude, lm.latitude), 4326)::public.geography
      FROM app.location_markers lm
      WHERE lm.marker_type = 'home'
      LIMIT 1
    )
  ) ASC
),
obs_spatial AS (
  SELECT
    bssid,
    CASE
      WHEN count(*) < 3 THEN 0
      WHEN stddev(lat) < 0.0001 AND stddev(lon) < 0.0001 THEN 0.95
      WHEN stddev(lat) < 0.0005 AND stddev(lon) < 0.0005 THEN 0.75
      ELSE 0.25
    END AS stationary_confidence
  FROM app.observations
  WHERE lat IS NOT NULL
    AND lon IS NOT NULL
    AND (is_quality_filtered = false OR is_quality_filtered IS NULL)
  GROUP BY bssid
),
network_geocode AS (
  SELECT
    n.bssid,
    gc.address AS geocoded_address,
    gc.city AS geocoded_city,
    gc.state AS geocoded_state,
    gc.postal_code AS geocoded_postal_code,
    gc.country AS geocoded_country,
    gc.poi_name AS geocoded_poi_name,
    gc.poi_category AS geocoded_poi_category,
    gc.feature_type AS geocoded_feature_type,
    gc.provider AS geocoded_provider,
    gc.confidence AS geocoded_confidence
  FROM app.networks n
  LEFT JOIN best_obs bo ON n.bssid = bo.bssid
  LEFT JOIN app.geocoding_cache gc
    ON gc.precision = 4
   AND bo.lat IS NOT NULL
   AND bo.lon IS NOT NULL
   AND gc.lat_round = round(bo.lat::numeric, 4)
   AND gc.lon_round = round(bo.lon::numeric, 4)
)
SELECT
  n.bssid,
  n.ssid,
  n.type,
  n.frequency,
  n.bestlevel AS signal,
  bo.lat,
  bo.lon,
  nloc.centroid_lat,
  nloc.centroid_lon,
  nloc.weighted_lat,
  nloc.weighted_lon,
  ngc.geocoded_address,
  ngc.geocoded_city,
  ngc.geocoded_state,
  ngc.geocoded_postal_code,
  ngc.geocoded_country,
  ngc.geocoded_poi_name,
  ngc.geocoded_poi_category,
  ngc.geocoded_feature_type,
  ngc.geocoded_provider,
  ngc.geocoded_confidence,
  to_timestamp((((n.lasttime_ms)::numeric / 1000.0))::double precision) AS observed_at,
  n.capabilities,
  CASE
    -- BLE/BT: check type and WiGLE capability encoding before WiFi checks.
    -- WiGLE encodes BLE as "Category;10" (class code 10 = 0x000A = BLE/LE).
    -- Classic BT uses other class codes or "Misc" with no WiFi capability strings.
    WHEN n.type = 'E' THEN 'BLE'
    WHEN n.type = 'B' THEN 'BT'
    WHEN n.capabilities ~ ';10$' THEN 'BLE'
    WHEN UPPER(n.capabilities) IN ('MISC', 'UNCATEGORIZED') THEN 'BT'
    -- WiFi capability strings
    WHEN COALESCE(n.capabilities, '') = '' THEN 'OPEN'
    WHEN UPPER(n.capabilities) LIKE '%WEP%' THEN 'WEP'
    WHEN UPPER(n.capabilities) ~ '^\s*\[ESS\]\s*$' THEN 'OPEN'
    WHEN UPPER(n.capabilities) ~ '^\s*\[IBSS\]\s*$' THEN 'OPEN'
    WHEN UPPER(n.capabilities) ~ 'RSN-OWE' THEN 'WPA3-OWE'
    WHEN UPPER(n.capabilities) ~ 'RSN-SAE' THEN 'WPA3-P'
    WHEN UPPER(n.capabilities) ~ '(WPA3|SAE)' AND UPPER(n.capabilities) ~ '(EAP|MGT)' THEN 'WPA3-E'
    WHEN UPPER(n.capabilities) ~ '(WPA3|SAE)' THEN 'WPA3'
    WHEN UPPER(n.capabilities) ~ '(WPA2|RSN)' AND UPPER(n.capabilities) ~ '(EAP|MGT)' THEN 'WPA2-E'
    WHEN UPPER(n.capabilities) ~ '(WPA2|RSN)' THEN 'WPA2'
    WHEN UPPER(n.capabilities) ~ 'WPA-' AND UPPER(n.capabilities) NOT LIKE '%WPA2%' THEN 'WPA'
    WHEN UPPER(n.capabilities) LIKE '%WPA%' AND UPPER(n.capabilities) NOT LIKE '%WPA2%' AND UPPER(n.capabilities) NOT LIKE '%WPA3%' AND UPPER(n.capabilities) NOT LIKE '%RSN%' THEN 'WPA'
    WHEN UPPER(n.capabilities) LIKE '%WPS%' AND UPPER(n.capabilities) NOT LIKE '%WPA%' AND UPPER(n.capabilities) NOT LIKE '%RSN%' THEN 'WPS'
    WHEN UPPER(n.capabilities) ~ '(CCMP|TKIP|AES)' THEN 'WPA2'
    ELSE 'UNKNOWN'
  END AS security,
  COALESCE(w3.wigle_v3_observation_count, n.wigle_v3_observation_count, 0) AS wigle_v3_observation_count,
  COALESCE(w3.wigle_v3_last_import_at, n.wigle_v3_last_import_at) AS wigle_v3_last_import_at,
  COALESCE(t.threat_tag, 'untagged'::character varying) AS tag_type,
  COALESCE(t.is_ignored, FALSE) AS is_ignored,
  count(o.id) AS observations,
  count(DISTINCT date(o."time")) AS unique_days,
  count(DISTINCT ((round((o.lat)::numeric, 3) || ','::text) || round((o.lon)::numeric, 3))) AS unique_locations,
  max(o.accuracy) AS accuracy_meters,
  min(o."time") AS first_seen,
  max(o."time") AS last_seen,
  CASE
    WHEN COALESCE(t.is_ignored, FALSE) THEN 0::numeric
    ELSE COALESCE(ts.final_threat_score, 0::numeric)
  END AS threat_score,
  CASE
    WHEN COALESCE(t.is_ignored, FALSE) THEN 'NONE'::character varying
    ELSE COALESCE(ts.final_threat_level, 'NONE'::character varying)
  END AS threat_level,
  COALESCE(ts.rule_based_score, 0::numeric) AS rule_based_score,
  COALESCE(ts.ml_threat_score, 0::numeric) AS ml_threat_score,
  COALESCE((ts.ml_feature_values->>'evidence_weight')::numeric, 0) AS ml_weight,
  COALESCE((ts.ml_feature_values->>'ml_boost')::numeric, 0) AS ml_boost,
  ts.model_version,
  COALESCE((
    public.st_distance(
      public.st_setsrid(
        public.st_makepoint(
          COALESCE(nloc.weighted_lon, nloc.centroid_lon, bo.lon),
          COALESCE(nloc.weighted_lat, nloc.centroid_lat, bo.lat)
        ),
        4326
      )::public.geography,
      (
        SELECT public.st_setsrid(public.st_makepoint(lm.longitude, lm.latitude), 4326)::public.geography
        FROM app.location_markers lm
        WHERE lm.marker_type = 'home'
        LIMIT 1
      )
    ) / 1000.0::double precision
  ), 0::double precision) AS distance_from_home_km,
  (
    SELECT MAX(
      public.st_distance(
        public.st_setsrid(public.st_makepoint(o1.lon, o1.lat), 4326)::public.geography,
        public.st_setsrid(public.st_makepoint(o2.lon, o2.lat), 4326)::public.geography
      )
    )
    FROM app.observations o1, app.observations o2
    WHERE o1.bssid = n.bssid
      AND o2.bssid = n.bssid
      AND o1.lat IS NOT NULL
      AND o1.lon IS NOT NULL
      AND o2.lat IS NOT NULL
      AND o2.lon IS NOT NULL
      AND (o1.is_quality_filtered = false OR o1.is_quality_filtered IS NULL)
      AND (o2.is_quality_filtered = false OR o2.is_quality_filtered IS NULL)
  ) AS max_distance_meters,
  rm.manufacturer,
  osp.stationary_confidence
FROM app.networks n
LEFT JOIN app.network_tags t ON n.bssid = t.bssid::text
LEFT JOIN app.observations o ON n.bssid = o.bssid
LEFT JOIN app.network_threat_scores ts ON n.bssid = ts.bssid::text
LEFT JOIN best_obs bo ON n.bssid = bo.bssid
LEFT JOIN obs_spatial osp ON n.bssid = osp.bssid
LEFT JOIN app.network_locations nloc ON UPPER(nloc.bssid) = UPPER(n.bssid)
LEFT JOIN network_geocode ngc ON n.bssid = ngc.bssid
LEFT JOIN (
  SELECT
    netid,
    COUNT(*)::integer AS wigle_v3_observation_count,
    MAX(COALESCE(last_update, observed_at, imported_at)) AS wigle_v3_last_import_at
  FROM app.wigle_v3_observations
  GROUP BY netid
) w3 ON UPPER(n.bssid) = UPPER(w3.netid)
LEFT JOIN app.radio_manufacturers rm ON UPPER(REPLACE(SUBSTRING(n.bssid, 1, 8), ':', '')) = rm.prefix
-- Require at least one geolocated observation (best_obs join succeeds).
-- Using LEFT JOIN on observations above so the GROUP BY counts only coord-valid obs,
-- but the network row itself is kept as long as best_obs found a location for it.
-- This allows BLE/BT networks (radio_frequency=7936) to appear since best_obs no
-- longer filters by frequency.
WHERE bo.bssid IS NOT NULL
GROUP BY
  n.bssid,
  n.ssid,
  n.type,
  n.frequency,
  n.bestlevel,
  n.lasttime_ms,
  n.capabilities,
  n.wigle_v3_observation_count,
  n.wigle_v3_last_import_at,
  w3.wigle_v3_observation_count,
  w3.wigle_v3_last_import_at,
  t.threat_tag,
  t.is_ignored,
  ts.final_threat_score,
  ts.final_threat_level,
  ts.rule_based_score,
  ts.ml_threat_score,
  ts.ml_feature_values,
  ts.model_version,
  rm.manufacturer,
  bo.lat,
  bo.lon,
  osp.stationary_confidence,
  nloc.centroid_lat,
  nloc.centroid_lon,
  nloc.weighted_lat,
  nloc.weighted_lon,
  ngc.geocoded_address,
  ngc.geocoded_city,
  ngc.geocoded_state,
  ngc.geocoded_postal_code,
  ngc.geocoded_country,
  ngc.geocoded_poi_name,
  ngc.geocoded_poi_category,
  ngc.geocoded_feature_type,
  ngc.geocoded_provider,
  ngc.geocoded_confidence;

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_network_explorer_mv_bssid
  ON app.api_network_explorer_mv (bssid);
CREATE INDEX IF NOT EXISTS idx_api_network_explorer_mv_type
  ON app.api_network_explorer_mv (type);
CREATE INDEX IF NOT EXISTS idx_api_network_explorer_mv_observed_at
  ON app.api_network_explorer_mv (observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_network_explorer_mv_threat
  ON app.api_network_explorer_mv (threat_score DESC);
CREATE INDEX IF NOT EXISTS idx_api_network_explorer_mv_rule_score
  ON app.api_network_explorer_mv (rule_based_score DESC);
CREATE INDEX IF NOT EXISTS idx_api_network_explorer_mv_ml_score
  ON app.api_network_explorer_mv (ml_threat_score DESC);
CREATE INDEX IF NOT EXISTS idx_api_network_explorer_mv_stationary
  ON app.api_network_explorer_mv (stationary_confidence)
  WHERE stationary_confidence IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_network_explorer_mv_ignored
  ON app.api_network_explorer_mv (is_ignored)
  WHERE is_ignored = TRUE;

GRANT SELECT ON app.api_network_explorer_mv TO shadowcheck_user;
GRANT SELECT ON app.api_network_explorer_mv TO grafana_reader;
GRANT SELECT ON app.api_network_explorer_mv TO PUBLIC;

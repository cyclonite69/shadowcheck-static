-- Migration: 20260506_widen_wigle_bt_type_column.sql
-- Widens app.wigle_v2_bluetooth_search.type from VARCHAR(10) to TEXT.
-- WiGLE BT API returns type values (e.g. "BT_CLASSIC", "BT_LE", "BLE") that
-- can exceed 10 characters, causing value-too-long truncation errors on insert.
--
-- Two objects depend on this column and must be dropped first:
--   1. app.api_wigle_networks_mv (materialized view) — references bt.type via UNION ALL
--   2. app.wigle_v2_radio_search (view) — references type directly
-- DROP ... CASCADE on the MV removes both. Both are recreated after the ALTER.

SET search_path TO app, public;

-- Drop both dependents (CASCADE removes wigle_v2_radio_search too)
DROP MATERIALIZED VIEW IF EXISTS app.api_wigle_networks_mv CASCADE;

ALTER TABLE app.wigle_v2_bluetooth_search
  ALTER COLUMN type TYPE TEXT;

-- ── Recreate app.api_wigle_networks_mv ───────────────────────────────────────

CREATE MATERIALIZED VIEW app.api_wigle_networks_mv AS

WITH v3_dedup AS (
  SELECT DISTINCT ON (UPPER(netid)) *
  FROM app.wigle_v3_network_details
  ORDER BY UPPER(netid)
),

v2_dedup AS (
  SELECT DISTINCT ON (UPPER(bssid)) *
  FROM app.wigle_v2_networks_search
  ORDER BY UPPER(bssid)
),

v3_obs_agg AS (
  SELECT
    obs.netid,
    COUNT(*)::int                                                        AS wigle_v3_observation_count,
    MIN(obs.observed_at)                                                 AS wigle_v3_first_seen,
    MAX(obs.observed_at)                                                 AS wigle_v3_last_seen,
    AVG(obs.latitude)::double precision                                  AS wigle_v3_centroid_lat,
    AVG(obs.longitude)::double precision                                 AS wigle_v3_centroid_lon,
    MIN(obs.latitude)                                                    AS wigle_v3_min_lat,
    MAX(obs.latitude)                                                    AS wigle_v3_max_lat,
    MIN(obs.longitude)                                                   AS wigle_v3_min_lon,
    MAX(obs.longitude)                                                   AS wigle_v3_max_lon,
    MAX(obs.frequency)                                                   AS frequency,
    MAX(obs.channel)                                                     AS channel,
    CASE
      WHEN COUNT(*) > 1 THEN
        ROUND(
          ST_Distance(
            ST_MakePoint(MIN(obs.longitude), MIN(obs.latitude))::geography,
            ST_MakePoint(MAX(obs.longitude), MAX(obs.latitude))::geography
          )::numeric,
          1
        )
      ELSE 0
    END::double precision                                                AS wigle_v3_spread_m,
    COUNT(DISTINCT NULLIF(TRIM(obs.ssid), ''))::int                      AS wigle_v3_ssid_variant_count
  FROM app.wigle_v3_observations obs
  GROUP BY obs.netid
),

local_agg AS (
  SELECT
    UPPER(bssid)                                                         AS bssid,
    COUNT(*)::int                                                        AS local_observation_count,
    MIN(observed_at)                                                     AS local_first_seen,
    MAX(observed_at)                                                     AS local_last_seen
  FROM app.observations
  GROUP BY UPPER(bssid)
),

wifi_bssids AS (
  SELECT UPPER(COALESCE(d.netid, v2.bssid)) AS bssid
  FROM v3_dedup d
  FULL OUTER JOIN v2_dedup v2 ON UPPER(d.netid) = UPPER(v2.bssid)
  WHERE COALESCE(d.netid, v2.bssid) IS NOT NULL
),

bt_dedup AS (
  SELECT DISTINCT ON (bssid) *
  FROM app.wigle_v2_bluetooth_search
  ORDER BY bssid, lasttime DESC
)

-- ── WiFi rows ─────────────────────────────────────────────────────────────────
SELECT
  UPPER(COALESCE(d.netid, v2.bssid))                                    AS bssid,
  COALESCE(v2.ssid, d.ssid, d.name)                                     AS ssid_display,
  COALESCE(v2.name, d.name)                                             AS network_name,
  COALESCE(v2.type, d.type)                                             AS network_type,
  COALESCE(v2.encryption, d.encryption)                                 AS encryption,
  COALESCE(v2.channel, d.channel, agg.channel)                          AS channel,
  COALESCE(v2.frequency, agg.frequency)                                 AS frequency,
  COALESCE(v2.qos, d.qos)                                               AS qos,
  d.comment                                                              AS comment,
  CASE WHEN d.netid IS NOT NULL THEN 'wigle-v3' ELSE 'wigle-v2' END    AS wigle_source,
  v2.firsttime                                                           AS wigle_v2_firsttime,
  v2.lasttime                                                            AS wigle_v2_lasttime,
  v2.lastupdt                                                            AS wigle_v2_lastupdt,
  v2.trilat                                                              AS wigle_v2_trilat_lat,
  v2.trilong                                                             AS wigle_v2_trilat_lon,
  v2.city                                                                AS wigle_v2_city,
  v2.region                                                              AS wigle_v2_region,
  v2.road                                                                AS wigle_v2_road,
  v2.housenumber                                                         AS wigle_v2_housenumber,
  (v2.bssid IS NOT NULL)                                                AS has_wigle_v2_record,
  agg.wigle_v3_first_seen,
  agg.wigle_v3_last_seen,
  agg.wigle_v3_observation_count,
  agg.wigle_v3_ssid_variant_count,
  (agg.wigle_v3_observation_count IS NOT NULL)                          AS has_wigle_v3_observations,
  agg.wigle_v3_centroid_lat,
  agg.wigle_v3_centroid_lon,
  agg.wigle_v3_min_lat,
  agg.wigle_v3_max_lat,
  agg.wigle_v3_min_lon,
  agg.wigle_v3_max_lon,
  agg.wigle_v3_spread_m,
  CASE
    WHEN v2.trilat IS NOT NULL AND v2.trilong IS NOT NULL THEN v2.trilat::double precision
    WHEN agg.wigle_v3_centroid_lat IS NOT NULL              THEN agg.wigle_v3_centroid_lat
    ELSE d.trilat
  END                                                                    AS display_lat,
  CASE
    WHEN v2.trilat IS NOT NULL AND v2.trilong IS NOT NULL THEN v2.trilong::double precision
    WHEN agg.wigle_v3_centroid_lon IS NOT NULL              THEN agg.wigle_v3_centroid_lon
    ELSE d.trilon
  END                                                                    AS display_lon,
  CASE
    WHEN v2.trilat IS NOT NULL AND v2.trilong IS NOT NULL THEN 'wigle-v2-trilat'
    WHEN agg.wigle_v3_centroid_lat IS NOT NULL              THEN 'wigle-v3-centroid'
    WHEN d.trilat IS NOT NULL                               THEN 'wigle-v3-summary'
    ELSE NULL
  END                                                                    AS display_coordinate_source,
  rm.manufacturer,
  (COALESCE(agg.wigle_v3_spread_m, 0) > 500)                           AS public_nonstationary_flag,
  (COALESCE(agg.wigle_v3_ssid_variant_count, 0) > 1)                   AS public_ssid_variant_flag,
  (agg.wigle_v3_observation_count IS NOT NULL
    AND agg.wigle_v3_observation_count < 3)                             AS wigle_precision_warning,
  (la.bssid IS NOT NULL)                                                AS has_local_match,
  COALESCE(la.local_observation_count, 0)                               AS local_observation_count,
  la.local_first_seen,
  la.local_last_seen,
  NULL::BIGINT                                                           AS mfgrid

FROM v3_dedup d
FULL OUTER JOIN v2_dedup v2
  ON UPPER(d.netid) = UPPER(v2.bssid)
LEFT JOIN v3_obs_agg agg
  ON agg.netid = d.netid
LEFT JOIN local_agg la
  ON la.bssid = UPPER(COALESCE(d.netid, v2.bssid))
LEFT JOIN app.radio_manufacturers rm
  ON rm.bit_length = 24
  AND rm.prefix = UPPER(LEFT(REPLACE(COALESCE(d.netid, v2.bssid), ':', ''), 6))

UNION ALL

-- ── BT/BLE rows ───────────────────────────────────────────────────────────────
SELECT
  bt.bssid,
  bt.name                                                                AS ssid_display,
  bt.name                                                                AS network_name,
  bt.type                                                                AS network_type,
  NULL::TEXT                                                             AS encryption,
  NULL::INTEGER                                                          AS channel,
  NULL::INTEGER                                                          AS frequency,
  bt.qos,
  bt.comment,
  'wigle-v2'::TEXT                                                       AS wigle_source,
  bt.firsttime                                                           AS wigle_v2_firsttime,
  bt.lasttime                                                            AS wigle_v2_lasttime,
  bt.lastupdt                                                            AS wigle_v2_lastupdt,
  bt.trilat                                                              AS wigle_v2_trilat_lat,
  bt.trilong                                                             AS wigle_v2_trilat_lon,
  bt.city                                                                AS wigle_v2_city,
  bt.region                                                              AS wigle_v2_region,
  bt.road                                                                AS wigle_v2_road,
  bt.housenumber                                                         AS wigle_v2_housenumber,
  TRUE                                                                   AS has_wigle_v2_record,
  NULL::TIMESTAMPTZ                                                      AS wigle_v3_first_seen,
  NULL::TIMESTAMPTZ                                                      AS wigle_v3_last_seen,
  NULL::INTEGER                                                          AS wigle_v3_observation_count,
  NULL::INTEGER                                                          AS wigle_v3_ssid_variant_count,
  FALSE                                                                  AS has_wigle_v3_observations,
  NULL::DOUBLE PRECISION                                                 AS wigle_v3_centroid_lat,
  NULL::DOUBLE PRECISION                                                 AS wigle_v3_centroid_lon,
  NULL::DOUBLE PRECISION                                                 AS wigle_v3_min_lat,
  NULL::DOUBLE PRECISION                                                 AS wigle_v3_max_lat,
  NULL::DOUBLE PRECISION                                                 AS wigle_v3_min_lon,
  NULL::DOUBLE PRECISION                                                 AS wigle_v3_max_lon,
  0::DOUBLE PRECISION                                                    AS wigle_v3_spread_m,
  bt.trilat::DOUBLE PRECISION                                            AS display_lat,
  bt.trilong::DOUBLE PRECISION                                           AS display_lon,
  'wigle-v2-trilat'::TEXT                                                AS display_coordinate_source,
  rm.manufacturer,
  FALSE                                                                  AS public_nonstationary_flag,
  FALSE                                                                  AS public_ssid_variant_flag,
  FALSE                                                                  AS wigle_precision_warning,
  (la.bssid IS NOT NULL)                                                AS has_local_match,
  COALESCE(la.local_observation_count, 0)                               AS local_observation_count,
  la.local_first_seen,
  la.local_last_seen,
  bt.mfgrid

FROM bt_dedup bt
LEFT JOIN local_agg la
  ON la.bssid = bt.bssid
LEFT JOIN app.radio_manufacturers rm
  ON rm.bit_length = 24
  AND rm.prefix = UPPER(LEFT(REPLACE(bt.netid, ':', ''), 6))
WHERE NOT EXISTS (
  SELECT 1 FROM wifi_bssids wb WHERE wb.bssid = bt.bssid
)

WITH DATA;

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX idx_wigle_networks_mv_bssid
  ON app.api_wigle_networks_mv (bssid);

CREATE INDEX idx_wigle_networks_mv_display_coords
  ON app.api_wigle_networks_mv (display_lat, display_lon)
  WHERE display_lat IS NOT NULL AND display_lon IS NOT NULL;

CREATE INDEX idx_wigle_networks_mv_nonstationary
  ON app.api_wigle_networks_mv (public_nonstationary_flag)
  WHERE public_nonstationary_flag = TRUE;

CREATE INDEX idx_wigle_networks_mv_has_v3
  ON app.api_wigle_networks_mv (has_wigle_v3_observations, wigle_v3_observation_count);

CREATE INDEX idx_wigle_networks_mv_has_local_match
  ON app.api_wigle_networks_mv (has_local_match)
  WHERE has_local_match = TRUE;

CREATE INDEX idx_wigle_networks_mv_network_type
  ON app.api_wigle_networks_mv (network_type)
  WHERE network_type IN ('BT', 'BLE');

CREATE INDEX idx_wigle_networks_mv_mfgrid
  ON app.api_wigle_networks_mv (mfgrid)
  WHERE mfgrid IS NOT NULL;

-- ── Grants ────────────────────────────────────────────────────────────────────

GRANT SELECT ON app.api_wigle_networks_mv TO shadowcheck_user;
GRANT SELECT ON app.api_wigle_networks_mv TO shadowcheck_admin;

-- ── Refresh function ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION app.refresh_wigle_networks_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews WHERE schemaname = 'app' AND matviewname = 'api_wigle_networks_mv'
  ) THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY app.api_wigle_networks_mv;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION app.refresh_wigle_networks_mv() TO shadowcheck_admin;

-- ── Recreate app.wigle_v2_radio_search (was dropped by CASCADE above) ─────────

CREATE VIEW app.wigle_v2_radio_search AS
  SELECT
    bssid                  AS netid,
    ssid,
    type,
    trilat::double precision,
    trilong::double precision,
    firsttime,
    lasttime,
    city,
    region,
    country,
    NULL::BIGINT           AS mfgrid,
    'wifi'::TEXT           AS radio_source
  FROM app.wigle_v2_networks_search
UNION ALL
  SELECT
    netid,
    name                   AS ssid,
    type,
    trilat::double precision,
    trilong::double precision,
    firsttime,
    lasttime,
    city,
    region,
    country,
    mfgrid,
    'bluetooth'::TEXT      AS radio_source
  FROM app.wigle_v2_bluetooth_search;

GRANT SELECT ON app.wigle_v2_radio_search TO shadowcheck_user;
GRANT SELECT ON app.wigle_v2_radio_search TO shadowcheck_admin;

-- Migration: app.surveillance_density_zones materialized view
-- Aggregates surveillance detections into geographic density zones using a
-- 0.002° (~200m) grid. density_weight formula: 30/20/50 split across
-- device count, observation depth, and temporal persistence.

CREATE MATERIALIZED VIEW app.surveillance_density_zones AS
WITH surveillance_located AS (
  SELECT
    sd.bssid,
    sd.device_type,
    sd.confidence,
    sd.threat_score,
    sd.false_positive,
    COALESCE(ne.centroid_lat, ne.lat)                              AS lat,
    COALESCE(ne.centroid_lon, ne.lon)                              AS lon,
    COALESCE(ne.observations, 0)                                   AS observations,
    COALESCE(
      EXTRACT(EPOCH FROM (ne.last_seen - ne.first_seen)) / 86400.0,
      0
    )                                                              AS persistence_days
  FROM app.surveillance_detections sd
  JOIN app.api_network_explorer_mv ne ON UPPER(ne.bssid) = UPPER(sd.bssid)
  WHERE sd.false_positive = FALSE
    AND COALESCE(ne.centroid_lat, ne.lat) IS NOT NULL
    AND COALESCE(ne.centroid_lon, ne.lon) IS NOT NULL
),
gridded AS (
  SELECT
    ST_SnapToGrid(
      ST_SetSRID(ST_MakePoint(lon, lat), 4326),
      0.002
    )             AS cell,
    bssid,
    device_type,
    confidence,
    threat_score,
    observations,
    persistence_days
  FROM surveillance_located
),
zones AS (
  SELECT
    cell,
    ST_Y(cell)                                                     AS zone_lat,
    ST_X(cell)                                                     AS zone_lon,
    COUNT(DISTINCT bssid)                                          AS device_count,
    array_agg(DISTINCT device_type ORDER BY device_type)           AS device_types,
    ROUND(AVG(confidence)::numeric, 2)                             AS avg_confidence,
    ROUND(MAX(confidence)::numeric, 2)                             AS max_confidence,
    ROUND(AVG(threat_score)::numeric, 1)                           AS avg_threat_score,
    ROUND(MAX(threat_score)::numeric, 1)                           AS max_threat_score,
    SUM(observations)                                              AS total_observations,
    ROUND(AVG(persistence_days)::numeric, 1)                       AS avg_persistence_days,
    ROUND(MAX(persistence_days)::numeric, 1)                       AS max_persistence_days,
    ROUND(LEAST(
        COUNT(DISTINCT bssid)                    * 30.0
      + LEAST(SUM(observations) / 10.0, 20.0)
      + LEAST(AVG(persistence_days) / 30.0 * 50.0, 50.0),
      100.0
    )::numeric, 1)                                                 AS density_weight
  FROM gridded
  GROUP BY cell
)
SELECT
  row_number() OVER (ORDER BY density_weight DESC)                 AS id,
  zone_lat,
  zone_lon,
  ST_SetSRID(cell, 4326)                                          AS geom,
  device_count,
  device_types,
  avg_confidence,
  max_confidence,
  avg_threat_score,
  max_threat_score,
  total_observations,
  avg_persistence_days,
  max_persistence_days,
  density_weight,
  NOW()                                                            AS refreshed_at
FROM zones
ORDER BY density_weight DESC;

CREATE UNIQUE INDEX ON app.surveillance_density_zones (id);
CREATE INDEX ON app.surveillance_density_zones USING GIST (geom);
CREATE INDEX ON app.surveillance_density_zones (density_weight DESC);

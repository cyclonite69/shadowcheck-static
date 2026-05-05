-- Migration: app.surveillance_density_zones materialized view (ratio normalization)
-- Aggregates surveillance detections into 0.002° (~200m) grid cells.
-- Includes total_networks denominator for surveillance_ratio and
-- density_weight with 30/20/50 device/observation/persistence split.

CREATE MATERIALIZED VIEW app.surveillance_density_zones AS
WITH surveillance_located AS (
  SELECT
    sd.bssid,
    sd.device_type,
    sd.confidence,
    sd.false_positive,
    COALESCE(ne.centroid_lat, ne.lat)                              AS lat,
    COALESCE(ne.centroid_lon, ne.lon)                              AS lon,
    COALESCE(ne.observations, 0)                                   AS observations,
    COALESCE(
      EXTRACT(EPOCH FROM (ne.last_seen - ne.first_seen)) / 86400.0,
      0
    )                                                              AS persistence_days
  FROM app.surveillance_detections sd
  JOIN app.api_network_explorer_mv ne
    ON UPPER(ne.bssid) = UPPER(sd.bssid)
  WHERE sd.false_positive = FALSE
    AND COALESCE(ne.centroid_lat, ne.lat) IS NOT NULL
),
all_networks_gridded AS (
  SELECT
    ST_SnapToGrid(
      ST_SetSRID(ST_MakePoint(
        COALESCE(ne.centroid_lon, ne.lon),
        COALESCE(ne.centroid_lat, ne.lat)
      ), 4326),
      0.002
    )                             AS cell,
    COUNT(DISTINCT ne.bssid)      AS total_networks
  FROM app.api_network_explorer_mv ne
  WHERE COALESCE(ne.centroid_lat, ne.lat) IS NOT NULL
  GROUP BY 1
),
surveillance_gridded AS (
  SELECT
    ST_SnapToGrid(
      ST_SetSRID(ST_MakePoint(lon, lat), 4326),
      0.002
    )                                                              AS cell,
    COUNT(DISTINCT bssid)                                          AS device_count,
    array_agg(DISTINCT device_type ORDER BY device_type)           AS device_types,
    ROUND(AVG(confidence)::numeric, 2)                             AS avg_confidence,
    SUM(observations)                                              AS total_observations,
    ROUND(AVG(persistence_days)::numeric, 1)                       AS avg_persistence_days,
    ROUND(LEAST(
        COUNT(DISTINCT bssid)                    * 30.0
      + LEAST(SUM(observations) / 10.0, 20.0)
      + LEAST(AVG(persistence_days) / 30.0 * 50.0, 50.0),
      100.0
    )::numeric, 1)                                                 AS density_weight
  FROM surveillance_located
  GROUP BY 1
),
joined AS (
  SELECT
    ST_Y(sg.cell)                                                  AS zone_lat,
    ST_X(sg.cell)                                                  AS zone_lon,
    ST_SetSRID(sg.cell, 4326)                                      AS geom,
    sg.device_count,
    sg.device_types,
    sg.avg_confidence,
    sg.total_observations,
    sg.avg_persistence_days,
    an.total_networks,
    ROUND((sg.device_count::numeric /
      NULLIF(an.total_networks, 0) * 100), 2)                      AS surveillance_ratio,
    sg.density_weight
  FROM surveillance_gridded sg
  JOIN all_networks_gridded an ON an.cell = sg.cell
)
SELECT
  row_number() OVER (ORDER BY density_weight DESC)                 AS id,
  zone_lat,
  zone_lon,
  geom,
  device_count,
  device_types,
  avg_confidence,
  total_observations,
  avg_persistence_days,
  total_networks,
  surveillance_ratio,
  density_weight,
  NOW()                                                            AS refreshed_at
FROM joined
ORDER BY density_weight DESC;

CREATE UNIQUE INDEX ON app.surveillance_density_zones (id);
CREATE INDEX ON app.surveillance_density_zones USING GIST (geom);
CREATE INDEX ON app.surveillance_density_zones (density_weight DESC);
CREATE INDEX ON app.surveillance_density_zones (surveillance_ratio DESC);

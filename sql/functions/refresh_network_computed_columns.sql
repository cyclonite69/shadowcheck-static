-- Refresh computed columns in app.networks from observations
-- Run after ETL imports to keep networks table accurate
-- Updates: lasttime_ms, lastlat, lastlon, bestlevel, bestlat, bestlon

CREATE OR REPLACE FUNCTION app.refresh_network_computed_columns()
RETURNS TABLE(
  networks_updated bigint,
  execution_time_ms bigint
) AS $$
DECLARE
  start_time timestamptz;
  rows_affected bigint;
BEGIN
  start_time := clock_timestamp();
  
  -- Update all computed columns in one pass
  WITH obs_stats AS (
    SELECT 
      o.bssid,
      MAX(o.time) as max_time,
      MAX(o.level) as max_level
    FROM app.observations o
    GROUP BY o.bssid
  ),
  last_obs AS (
    SELECT DISTINCT ON (o.bssid)
      o.bssid,
      o.lat as last_lat,
      o.lon as last_lon,
      EXTRACT(EPOCH FROM o.time) * 1000 as last_time_ms
    FROM app.observations o
    INNER JOIN obs_stats s ON s.bssid = o.bssid AND s.max_time = o.time
    ORDER BY o.bssid, o.time DESC
  ),
  best_obs AS (
    -- Best = strongest signal, with GPS accuracy as tiebreaker
    SELECT DISTINCT ON (o.bssid)
      o.bssid,
      o.lat as best_lat,
      o.lon as best_lon,
      o.level as best_level
    FROM app.observations o
    INNER JOIN obs_stats s ON s.bssid = o.bssid AND s.max_level = o.level
    ORDER BY o.bssid, o.level DESC, o.accuracy ASC, o.time DESC
  )
  UPDATE app.networks n
  SET 
    lasttime_ms = l.last_time_ms,
    lastlat = l.last_lat,
    lastlon = l.last_lon,
    bestlevel = b.best_level,
    bestlat = b.best_lat,
    bestlon = b.best_lon
  FROM last_obs l
  INNER JOIN best_obs b ON b.bssid = l.bssid
  WHERE n.bssid = l.bssid
  AND (
    n.lasttime_ms != l.last_time_ms OR
    n.lastlat != l.last_lat OR
    n.lastlon != l.last_lon OR
    n.bestlevel != b.best_level OR
    n.bestlat != b.best_lat OR
    n.bestlon != b.best_lon
  );
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  RETURN QUERY SELECT 
    rows_affected,
    EXTRACT(EPOCH FROM (clock_timestamp() - start_time) * 1000)::bigint;
END;
$$ LANGUAGE plpgsql;

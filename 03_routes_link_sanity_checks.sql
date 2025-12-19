-- Coverage
SELECT COUNT(*) AS linked FROM observation_routes;

-- Orphans
SELECT COUNT(*)
FROM observations o
LEFT JOIN observation_routes r ON r.observation_id = o.id
WHERE r.observation_id IS NULL;

-- Time delta distribution
SELECT
  percentile_cont(0.5) WITHIN GROUP (ORDER BY time_delta_ms) AS median_ms,
  percentile_cont(0.9) WITHIN GROUP (ORDER BY time_delta_ms) AS p90_ms
FROM observation_routes;

-- Device split
SELECT device_id, COUNT(*)
FROM observation_routes
GROUP BY device_id;

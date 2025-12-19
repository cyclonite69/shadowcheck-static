BEGIN;

INSERT INTO observation_routes (
  observation_id,
  route_id,
  device_id,
  run_id,
  time_delta_ms
)
SELECT
  o.id AS observation_id,
  r.id AS route_id,
  o.device_id,
  r.run_id,
  ABS(o.observed_at_ms - r.observed_at_ms) AS time_delta_ms
FROM observations o
JOIN LATERAL (
  SELECT id, run_id, observed_at_ms
  FROM routes
  WHERE routes.device_id = o.device_id
  ORDER BY ABS(o.observed_at_ms - routes.observed_at_ms)
  LIMIT 1
) r ON TRUE
ON CONFLICT (observation_id) DO NOTHING;

COMMIT;

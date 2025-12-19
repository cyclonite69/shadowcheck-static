BEGIN;

WITH params AS (
  SELECT 2000::bigint AS max_delta_ms
),
candidate_matches AS (
  SELECT
    o.id AS observation_id,
    o.device_id,
    o.observed_at_ms,
    r.id AS route_id,
    r.route_at_ms,
    ABS(o.observed_at_ms - r.route_at_ms) AS delta_ms
  FROM observations o
  JOIN routes r
    ON r.device_id = o.device_id
),
ranked_matches AS (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY observation_id
      ORDER BY
        delta_ms ASC,
        route_at_ms ASC
    ) AS rn
  FROM candidate_matches
)
INSERT INTO observation_routes (
  observation_id,
  route_id,
  delta_ms,
  matched_at_ms,
  confidence_window_ms
)
SELECT
  observation_id,
  route_id,
  delta_ms,
  observed_at_ms AS matched_at_ms,
  params.max_delta_ms AS confidence_window_ms
FROM ranked_matches, params
WHERE rn = 1
  AND delta_ms <= params.max_delta_ms
ON CONFLICT (observation_id) DO NOTHING;

COMMIT;

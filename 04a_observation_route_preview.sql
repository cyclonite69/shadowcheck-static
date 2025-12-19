WITH params AS (
    SELECT 2000::bigint AS max_delta_ms
),

candidate_matches AS (
    SELECT
        o.observation_id,
        o.device_id,
        o.observed_at_ms,

        r.route_id,
        r.route_at_ms,

        ABS(o.observed_at_ms - r.route_at_ms) AS delta_ms,

        r.geom AS route_geom,
        r.altitude,
        r.speed

    FROM observations o
    JOIN routes r
      ON r.device_id = o.device_id
)

, ranked_matches AS (
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

SELECT
    observation_id,
    device_id,
    observed_at_ms,

    route_id,
    route_at_ms,
    delta_ms,

    route_geom,
    altitude,
    speed

FROM ranked_matches, params
WHERE rn = 1
  AND delta_ms <= params.max_delta_ms
ORDER BY observed_at_ms;

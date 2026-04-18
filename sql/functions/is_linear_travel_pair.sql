-- Shared helper: linear travel pair detection
--
-- Returns TRUE when a consecutive observation pair is consistent with a device
-- simply driving past (not actively surveilling). This is used by the threat
-- scoring pipeline to downweight or exclude pairs that are trivially explained
-- by normal vehicle movement.
--
-- Parameters:
--   distance_m       haversine distance between the two observation points (meters)
--   time_delta_s     time elapsed between observations (seconds, must be > 0)
--   threshold_m      max distance that qualifies for this gate (default 500m)
--   speed_min_kmh    lower bound of plausible vehicle speed (default 5 km/h)
--   speed_max_kmh    upper bound of plausible vehicle speed (default 80 km/h)
--
-- Edge cases handled:
--   time_delta_s <= 0  → false (identical or reversed timestamps; skip speed calc)
--   distance_m = 0     → false (stationary; not a drive-by)
--   distance_m > threshold_m → false (too far apart; outside gate window)
--   Missing coords     → caller must guard (function receives pre-computed distance)

CREATE OR REPLACE FUNCTION is_linear_travel_pair(
    distance_m      numeric,
    time_delta_s    numeric,
    threshold_m     numeric DEFAULT 500,
    speed_min_kmh   numeric DEFAULT 5,
    speed_max_kmh   numeric DEFAULT 80
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = app, public
AS $$
    SELECT CASE
        WHEN time_delta_s   <= 0            THEN false   -- identical/reversed timestamps
        WHEN distance_m      = 0            THEN false   -- stationary point; not a drive-by
        WHEN distance_m      > threshold_m  THEN false   -- outside gate distance window
        -- Implied speed in km/h: (m→km) / (s→h)
        ELSE ((distance_m / 1000.0) / (time_delta_s / 3600.0))
             BETWEEN speed_min_kmh AND speed_max_kmh
    END
$$;

COMMENT ON FUNCTION is_linear_travel_pair(numeric, numeric, numeric, numeric, numeric) IS
'Returns true when a consecutive observation pair is consistent with normal vehicle travel
 (distance ≤ threshold_m AND implied speed in [speed_min_kmh, speed_max_kmh]).
 Used by calculate_threat_score_v5* to gate linear travel from threat scoring.';

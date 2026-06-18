-- Migration: 20260613_055_get_wigle_safe_limit.sql
-- Self-tuning rate limit function. Reads empirical wall-hit data from
-- v_wigle_rate_limit_events and returns the safest observed ceiling minus 1.
-- Returns NULL when fewer than 3 data points exist — caller falls back to hardcoded default.

SET search_path TO app, public;

CREATE OR REPLACE FUNCTION app.get_wigle_safe_limit(p_kind TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    CASE
      -- Need at least 3 wall-hit events to trust the pattern
      WHEN COUNT(*) < 3 THEN NULL
      ELSE LEAST(
        MIN(requests_in_prior_hour),  -- most conservative request-axis ceiling
        MIN(results_in_prior_hour)    -- most conservative result-axis ceiling
      ) - 1
    END
  FROM app.v_wigle_rate_limit_events
  WHERE kind       = p_kind
    AND wall_hit_at > NOW() - INTERVAL '30 days';  -- don't learn from stale data
$$;

GRANT EXECUTE ON FUNCTION app.get_wigle_safe_limit(TEXT) TO shadowcheck_admin;

COMMENT ON FUNCTION app.get_wigle_safe_limit(TEXT) IS
  'Returns the empirically safe request limit for a WiGLE API kind based on observed '
  'rate-limit wall hits. Returns NULL until 3+ data points exist within 30 days, '
  'signalling the caller to fall back to the hardcoded default.';

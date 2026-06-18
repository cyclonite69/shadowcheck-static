-- Migration: 20260613_056_get_wigle_reset_profile.sql
-- Classifies WiGLE's rate-limit reset behavior as 'fixed_clock' or 'rolling_window'
-- by analyzing stddev of recovery_utc_hour across observed wall-hit events.
-- Returns 'insufficient_data' until 3+ events exist within 60 days.

SET search_path TO app, public;

CREATE OR REPLACE FUNCTION app.get_wigle_reset_profile(p_kind TEXT)
RETURNS TABLE (
  likely_reset_utc_hour  INT,
  avg_recovery_minutes   NUMERIC,
  reset_type             TEXT,   -- 'fixed_clock' | 'rolling_window' | 'insufficient_data'
  confidence             TEXT,   -- 'high' | 'medium' | 'low'
  sample_count           INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_count         INT;
  v_hour_stddev   NUMERIC;
  v_avg_recovery  NUMERIC;
  v_modal_hour    INT;
BEGIN
  SELECT
    COUNT(*)::INT,
    STDDEV(recovery_utc_hour),
    AVG(recovery_minutes),
    MODE() WITHIN GROUP (ORDER BY recovery_utc_hour)
  INTO v_count, v_hour_stddev, v_avg_recovery, v_modal_hour
  FROM app.v_wigle_rate_limit_events
  WHERE kind             = p_kind
    AND recovery_utc_hour IS NOT NULL
    AND wall_hit_at      > NOW() - INTERVAL '60 days';

  IF v_count < 3 THEN
    RETURN QUERY
      SELECT NULL::INT, NULL::NUMERIC, 'insufficient_data'::TEXT, 'low'::TEXT, v_count;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    v_modal_hour,
    ROUND(v_avg_recovery, 1),
    CASE
      -- Low stddev = resets at the same UTC hour consistently → fixed clock
      WHEN v_hour_stddev < 1.5 THEN 'fixed_clock'::TEXT
      -- High stddev = recovery time varies → rolling 24h window
      ELSE 'rolling_window'::TEXT
    END,
    CASE
      WHEN v_count >= 10 AND v_hour_stddev < 1.0 THEN 'high'::TEXT
      WHEN v_count >= 5  AND v_hour_stddev < 2.0 THEN 'medium'::TEXT
      ELSE 'low'::TEXT
    END,
    v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION app.get_wigle_reset_profile(TEXT) TO shadowcheck_admin;

COMMENT ON FUNCTION app.get_wigle_reset_profile(TEXT) IS
  'Classifies WiGLE reset behavior from observed wall-hit recovery times. '
  'fixed_clock = consistent UTC reset hour; rolling_window = variable recovery. '
  'Returns insufficient_data until 3+ events exist within 60 days.';

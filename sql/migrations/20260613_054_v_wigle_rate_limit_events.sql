-- Migration: 20260613_054_v_wigle_rate_limit_events.sql
-- View that surfaces wall-hit (rate_limited) ledger events enriched with:
--   - request/result volume in the prior hour (for safe-limit calibration)
--   - first successful request after the wall hit (for reset-window detection)
--   - recovery delta and UTC hour (for fixed-clock vs rolling-window classification)

SET search_path TO app, public;

CREATE OR REPLACE VIEW app.v_wigle_rate_limit_events AS
WITH wall_hits AS (
  SELECT id, kind, requested_at, retry_after_hint
  FROM app.wigle_ledger_events
  WHERE status = 'rate_limited'
)
SELECT
  w.id,
  w.kind,
  w.requested_at                                                   AS wall_hit_at,
  w.retry_after_hint,

  -- How many requests of this kind fired in the hour before the wall hit
  (
    SELECT COUNT(*)::INTEGER
    FROM app.wigle_ledger_events p
    WHERE p.kind         = w.kind
      AND p.requested_at > w.requested_at - INTERVAL '1 hour'
      AND p.requested_at < w.requested_at
  )                                                                AS requests_in_prior_hour,

  -- Sum of results returned in the hour before the wall hit
  (
    SELECT COALESCE(SUM(p.result_count), 0)::INTEGER
    FROM app.wigle_ledger_events p
    WHERE p.kind         = w.kind
      AND p.requested_at > w.requested_at - INTERVAL '1 hour'
      AND p.requested_at < w.requested_at
      AND p.result_count IS NOT NULL
  )                                                                AS results_in_prior_hour,

  -- First successful request after the wall hit
  (
    SELECT x.requested_at
    FROM app.wigle_ledger_events x
    WHERE x.kind         = w.kind
      AND x.id           > w.id
      AND x.status       = 'success'
    ORDER BY x.id ASC
    LIMIT 1
  )                                                                AS first_ok_after_wall,

  -- Minutes between wall hit and recovery (NULL if no recovery yet)
  EXTRACT(EPOCH FROM (
    (
      SELECT x.requested_at
      FROM app.wigle_ledger_events x
      WHERE x.kind   = w.kind
        AND x.id     > w.id
        AND x.status = 'success'
      ORDER BY x.id ASC
      LIMIT 1
    ) - w.requested_at
  ))::INTEGER / 60                                                 AS recovery_minutes,

  -- UTC hour at which recovery happened (for fixed-clock detection)
  EXTRACT(HOUR FROM (
    (
      SELECT x.requested_at
      FROM app.wigle_ledger_events x
      WHERE x.kind   = w.kind
        AND x.id     > w.id
        AND x.status = 'success'
      ORDER BY x.id ASC
      LIMIT 1
    ) AT TIME ZONE 'UTC'
  ))::INTEGER                                                      AS recovery_utc_hour

FROM wall_hits w;

GRANT SELECT ON app.v_wigle_rate_limit_events TO shadowcheck_admin;

COMMENT ON VIEW app.v_wigle_rate_limit_events IS
  'Each row is a WiGLE rate-limit wall hit, annotated with prior-hour request/result '
  'volume and recovery timing. Used by get_wigle_safe_limit() and get_wigle_reset_profile().';

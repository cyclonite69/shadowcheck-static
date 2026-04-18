-- Re-score all networks with v5 scoring function
-- Run as shadowcheck_admin

\echo 'Starting v5 re-score...'

WITH scored AS (
  SELECT n.bssid, calculate_threat_score_v5(n.bssid) AS details
  FROM app.networks n
  WHERE n.bssid IS NOT NULL
)
INSERT INTO app.network_threat_scores
  (bssid, rule_based_score, rule_based_flags, model_version, scored_at)
SELECT
  bssid,
  (details->>'total_score')::numeric,
  details->'components',
  details->>'model_version',
  NOW()
FROM scored
ON CONFLICT (bssid) DO UPDATE SET
  rule_based_score = EXCLUDED.rule_based_score,
  rule_based_flags = EXCLUDED.rule_based_flags,
  model_version    = EXCLUDED.model_version,
  scored_at        = NOW(),
  updated_at       = NOW();

\echo 'Re-score complete. Refreshing materialized view...'

REFRESH MATERIALIZED VIEW CONCURRENTLY app.api_network_explorer_mv;

\echo 'Done. Verifying...'

SELECT
  final_threat_level,
  COUNT(*) AS networks,
  MIN(final_threat_score) AS min_score,
  MAX(final_threat_score) AS max_score,
  ROUND(AVG(final_threat_score), 2) AS avg_score,
  COUNT(CASE WHEN model_version = '5.0' THEN 1 END) AS v5_count
FROM app.network_threat_scores
GROUP BY final_threat_level
ORDER BY MIN(final_threat_score);

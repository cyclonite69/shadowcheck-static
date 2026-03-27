-- DB-backed admin feature flags editable from the admin UI.

INSERT INTO app.settings (key, value, description)
VALUES
  (
    'admin_allow_docker',
    'false'::jsonb,
    'Allow PgAdmin and Docker-backed admin controls from the UI'
  ),
  (
    'admin_allow_ml_training',
    'true'::jsonb,
    'Allow ML model training from the admin UI'
  ),
  (
    'admin_allow_ml_scoring',
    'true'::jsonb,
    'Allow ML score recalculation from the admin UI'
  ),
  (
    'enable_background_jobs',
    'false'::jsonb,
    'Enable automatic background job scheduling'
  ),
  (
    'simple_rule_scoring_enabled',
    'false'::jsonb,
    'Use rule-based scoring only when calculating threat scores'
  )
ON CONFLICT (key) DO NOTHING;

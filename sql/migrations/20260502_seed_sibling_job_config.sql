-- Seed missing sibling_detection_job_config setting row
INSERT INTO app.settings (key, value, description)
VALUES (
    'sibling_detection_job_config',
    '{"enabled": true, "cron": "0 5 * * *"}'::jsonb,
    'Configuration for daily sibling radio detection'
)
ON CONFLICT (key) DO NOTHING;

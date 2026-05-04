-- Seed enable_background_jobs feature flag so the scheduler gate opens on EC2.
-- The env var ENABLE_BACKGROUND_JOBS is not set in any Docker compose file;
-- this row makes featureFlagService.getFlag('enable_background_jobs') return true
-- after its first refreshCache() call, regardless of the env var.
INSERT INTO app.settings (key, value)
VALUES ('enable_background_jobs', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

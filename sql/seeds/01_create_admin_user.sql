-- Create admin user with default password
-- Password: admin123
-- Run this after database restore or on fresh install

INSERT INTO app.users (username, password_hash, email, role, created_at)
VALUES (
  'admin',
  '$2b$10$TJa1kJP79.t0ax8C5vilXeB4z4lIRUvGU0mZlGey2vpOtJUYB3qxi',
  'admin@shadowcheck.local',
  'admin',
  NOW()
)
ON CONFLICT (username) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    updated_at = NOW();

-- Verify
SELECT username, email, role, created_at FROM app.users WHERE username = 'admin';

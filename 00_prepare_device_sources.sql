INSERT INTO device_sources (code) VALUES
  ('j24'),
  ('g63'),
  ('s22'),
  ('backup')
ON CONFLICT DO NOTHING;

TRUNCATE staging_networks;

-- Staging counts
SELECT device_id, COUNT(*) FROM staging_routes GROUP BY device_id;

-- Final counts
SELECT device_id, COUNT(*) FROM routes GROUP BY device_id;

-- Integrity checks
SELECT COUNT(*) FROM routes WHERE device_id NOT IN ('g63','backup');

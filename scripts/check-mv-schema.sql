-- Check MV schema and identify missing columns for filters

-- 1. List all columns in the MV
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'app' 
  AND table_name = 'api_network_explorer_mv'
ORDER BY ordinal_position;

-- 2. Check if threat score columns exist
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'app' 
      AND table_name = 'api_network_explorer_mv' 
      AND column_name = 'threat_score'
  ) THEN 'EXISTS' ELSE 'MISSING' END as threat_score_column;

-- 3. Check indexes on MV
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'app' 
  AND tablename = 'api_network_explorer_mv'
ORDER BY indexname;

-- 4. Sample a few rows to see what data is available
SELECT bssid, ssid, type, signal, frequency, channel
FROM app.api_network_explorer_mv
LIMIT 3;

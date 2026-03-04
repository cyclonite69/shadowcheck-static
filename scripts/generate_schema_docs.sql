-- Schema Documentation Generator
-- Purpose: Generate definitive schema reference for all app objects
-- Usage: \i scripts/generate_schema_docs.sql > schema_reference.txt

\pset pager off
\pset border 2

SELECT '=== SHADOWCHECK DATABASE SCHEMA REFERENCE ===' AS title;
SELECT 'Generated: ' || NOW() AS timestamp;
SELECT '';

\echo ''
\echo '=== ALL TABLES ==='
\echo ''

SELECT 
    table_name,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'app'
ORDER BY table_name, ordinal_position;

\echo ''
\echo '=== DETAILED TABLE SCHEMAS ==='
\echo ''

\d app.observations
\d app.networks
\d app.locations
\d app.network_threat_scores
\d app.threat_scores_cache
\d app.network_tags
\d app.network_cooccurrence
\d app.api_network_explorer_mv

\echo ''
\echo '=== ALL FUNCTIONS ==='
\echo ''

SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS returns
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'app'
ORDER BY p.proname;

\echo ''
\echo '=== ALL INDEXES ==='
\echo ''

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'app'
ORDER BY tablename, indexname;

\echo ''
\echo '=== ALL MATERIALIZED VIEWS ==='
\echo ''

SELECT 
    schemaname,
    matviewname,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) AS size
FROM pg_matviews
WHERE schemaname = 'app'
ORDER BY matviewname;

\echo ''
\echo '=== ALL TRIGGERS ==='
\echo ''

SELECT 
    trigger_schema,
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'app'
ORDER BY event_object_table, trigger_name;

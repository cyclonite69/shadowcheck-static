export {};

const { adminQuery } = require('./adminDbService');
const logger = require('../logging/logger');

/**
 * Fetch detailed database statistics including row counts, storage size, and activity metrics
 */
export async function getDetailedDatabaseStats(): Promise<any> {
  try {
    // 0. Run lightweight ANALYZE on primary dashboard tables to ensure catalog counts are accurate
    const tablesToAnalyze = [
      'app.observations',
      'app.networks',
      'app.network_sibling_pairs',
      'app.wigle_v3_observations',
      'app.kismet_packets',
    ];
    for (const table of tablesToAnalyze) {
      await adminQuery(`ANALYZE ${table}`);
    }

    // 1. Get Global DB Size
    const sizeResult = await adminQuery(
      "SELECT pg_size_pretty(pg_database_size('shadowcheck_db')) as total_size"
    );
    const totalDbSize = sizeResult.rows[0]?.total_size || 'Unknown';

    // Get Stats Reset Time
    const statsResetResult = await adminQuery(
      'SELECT stats_reset::text FROM pg_stat_bgwriter LIMIT 1'
    );
    const statsReset = statsResetResult.rows[0]?.stats_reset || null;

    // 2. Get Per-Table Metrics (Activity + Size)
    const { rows: tableStats } = await adminQuery(`
      SELECT 
        relname as table_name,
        n_live_tup as row_count,
        pg_total_relation_size(relid) as size_bytes,
        pg_size_pretty(pg_total_relation_size(relid)) as size_pretty,
        n_tup_ins as total_inserts,
        n_tup_upd as total_updates,
        n_tup_del as total_deletes,
        COALESCE(last_analyze, last_autoanalyze) as last_active,
        idx_scan as index_reads,
        seq_scan as sequential_reads
      FROM pg_stat_user_tables 
      WHERE schemaname = 'app'
      ORDER BY pg_total_relation_size(relid) DESC
    `);

    // 3. Categorize results for the frontend
    const categories = {
      core: [
        'networks',
        'observations',
        'device_sources',
        'radio_manufacturers',
        'network_sibling_pairs',
        'network_sibling_overrides',
      ],
      wigle: [
        'wigle_v2_networks_search',
        'wigle_v2_bluetooth_search',
        'wigle_v3_network_details',
        'wigle_v3_observations',
        'wigle_import_runs',
        'wigle_import_run_pages',
      ],
      kismet: [
        'kismet_devices',
        'kismet_packets',
        'kismet_alerts',
        'kismet_data',
        'kismet_datasources',
        'kismet_messages',
        'kismet_snapshots',
      ],
      infra: [
        'settings',
        'schema_migrations',
        'import_history',
        'geocoding_cache',
        'agency_offices',
        'federal_courthouses',
        'ai_insights',
      ],
    };

    // 4. Get Materialized View Health
    const { rows: mvStats } = await adminQuery(`
      SELECT 
        m.matviewname as view_name,
        m.ispopulated as is_populated,
        pg_size_pretty(pg_total_relation_size(quote_ident(m.schemaname) || '.' || quote_ident(m.matviewname))) as size_pretty,
        s.seq_scan,
        s.seq_tup_read,
        COALESCE(s.last_analyze, s.last_autoanalyze) as last_active
      FROM pg_matviews m
      LEFT JOIN pg_stat_user_tables s ON s.relname = m.matviewname AND s.schemaname = m.schemaname
      WHERE m.schemaname = 'app'
      ORDER BY m.matviewname ASC
    `);

    // 5. Get Unused Index Report with summary totals
    // Filter by catalog truth (indisunique=false, indisprimary=false) rather than name patterns
    const { rows: unusedIndexes } = await adminQuery(`
      SELECT
        n.nspname || '.' || t.relname AS table_name,
        i.relname AS index_name,
        COALESCE(s.idx_scan, 0) AS scan_count,
        pg_size_pretty(pg_relation_size(i.oid)) AS size_pretty,
        pg_relation_size(i.oid) AS size_bytes,
        pg_get_indexdef(i.oid) AS index_def,
        am.amname AS index_type,
        COALESCE(s.idx_tup_read, 0) AS idx_tup_read
      FROM pg_index ix
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_am am ON am.oid = i.relam
      LEFT JOIN pg_stat_user_indexes s ON s.indexrelid = ix.indexrelid
      WHERE n.nspname = 'app'
        AND ix.indisunique = false
        AND ix.indisprimary = false
        AND COALESCE(s.idx_scan, 0) = 0
      ORDER BY pg_relation_size(i.oid) DESC
    `);

    // 5b. Unique / primary key enforcement indexes
    const { rows: uniqueEnforcementIndexes } = await adminQuery(`
      SELECT
        t.relname AS table_name,
        i.relname AS index_name,
        pg_size_pretty(pg_relation_size(i.oid)) AS index_size,
        pg_relation_size(i.oid) AS size_bytes,
        am.amname AS index_type,
        ix.indisprimary AS is_primary,
        COALESCE(s.idx_scan, 0) AS times_used,
        pg_get_indexdef(i.oid) AS index_def
      FROM pg_index ix
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_am am ON am.oid = i.relam
      LEFT JOIN pg_stat_user_indexes s ON s.indexrelid = ix.indexrelid
      WHERE n.nspname = 'app'
        AND ix.indisunique = true
      ORDER BY t.relname, i.relname
    `);

    // 5c. Duplicate index groups (same structural definition on same table)
    const { rows: duplicateIndexGroups } = await adminQuery(`
      SELECT
        indrelid::regclass::text AS table_name,
        array_agg(indexrelid::regclass::text ORDER BY indexrelid::regclass::text) AS indexes,
        count(*)::int AS count
      FROM pg_index
      JOIN pg_stat_user_indexes ON pg_stat_user_indexes.indexrelid = pg_index.indexrelid
      WHERE schemaname = 'app'
      GROUP BY
        indrelid,
        indkey::text,
        indclass::text,
        indoption::text,
        indisunique,
        indisprimary,
        indisreplident,
        indpred::text,
        COALESCE(pg_get_expr(indexprs, indrelid)::text, '')
      HAVING count(*) > 1
      ORDER BY table_name
    `);

    // 6. Get Used Index Report (top 50 by scan count, excluding PKs)
    const { rows: usedIndexes } = await adminQuery(`
      SELECT
        schemaname || '.' || relname as table_name,
        indexrelname as index_name,
        idx_scan as scan_count,
        idx_tup_read as tuples_read,
        pg_size_pretty(pg_relation_size(indexrelid)) as size_pretty,
        pg_relation_size(indexrelid) as size_bytes
      FROM pg_stat_user_indexes
      WHERE schemaname = 'app'
        AND idx_scan > 0
        AND indexrelname NOT LIKE '%_pkey'
      ORDER BY idx_scan DESC
      LIMIT 50
    `);

    // Calculate unused index totals
    const unusedIndexCount = unusedIndexes.length;
    const unusedIndexTotalBytes = unusedIndexes.reduce((sum: number, idx: any) => {
      return sum + parseInt(idx.size_bytes, 10);
    }, 0);
    const unusedIndexTotalMb = (unusedIndexTotalBytes / (1024 * 1024)).toFixed(1);

    return {
      success: true,
      total_db_size: totalDbSize,
      stats_reset: statsReset,
      tables: tableStats,
      categories,
      materialized_views: mvStats,
      unused_indexes: unusedIndexes,
      unused_indexes_summary: {
        count: unusedIndexCount,
        total_mb: parseFloat(unusedIndexTotalMb),
      },
      used_indexes: usedIndexes,
      unique_enforcement_indexes: uniqueEnforcementIndexes,
      duplicate_index_groups: duplicateIndexGroups,
    };
  } catch (e: any) {
    logger.error('Failed to fetch detailed DB stats', { error: e.message });
    throw e;
  }
}

module.exports = {
  getDetailedDatabaseStats,
};

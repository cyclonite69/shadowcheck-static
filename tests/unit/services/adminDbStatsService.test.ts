import { getDetailedDatabaseStats } from '../../../server/src/services/adminDbStatsService';
import { adminQuery } from '../../../server/src/services/adminDbService';
import logger from '../../../server/src/logging/logger';

jest.mock('../../../server/src/services/adminDbService');
jest.mock('../../../server/src/logging/logger');

describe('adminDbStatsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getDetailedDatabaseStats returns formatted stats on success', async () => {
    (adminQuery as jest.Mock).mockImplementation(async (queryStr: string) => {
      if (queryStr.includes('pg_database_size')) {
        return { rows: [{ total_size: '100MB' }] };
      }
      if (queryStr.includes('relname as table_name')) {
        return { rows: [{ table_name: 'test' }] };
      }
      return { rows: [] };
    });

    const stats = await getDetailedDatabaseStats();
    expect(stats.total_db_size).toBe('100MB');
    expect(stats.tables).toHaveLength(1);
    expect(stats.success).toBe(true);

    // Verify all 5 ANALYZE queries were executed
    expect(adminQuery).toHaveBeenCalledWith('ANALYZE app.observations');
    expect(adminQuery).toHaveBeenCalledWith('ANALYZE app.networks');
    expect(adminQuery).toHaveBeenCalledWith('ANALYZE app.network_sibling_pairs');
    expect(adminQuery).toHaveBeenCalledWith('ANALYZE app.wigle_v3_observations');
    expect(adminQuery).toHaveBeenCalledWith('ANALYZE app.kismet_packets');

    const calls = (adminQuery as jest.Mock).mock.calls;
    expect(calls).toHaveLength(13);

    // Global size query
    expect(calls[5][0]).toEqual(
      "SELECT pg_size_pretty(pg_database_size('shadowcheck_db')) as total_size"
    );

    // Bgwriter stats query
    expect(calls[6][0]).toEqual('SELECT stats_reset::text FROM pg_stat_bgwriter LIMIT 1');

    // Table metrics query
    expect(calls[7][0]).toContain('relname as table_name');
    expect(calls[7][0]).toContain('n_live_tup as row_count');
    expect(calls[7][0]).toContain('FROM pg_stat_user_tables');
    expect(calls[7][0]).toContain("WHERE schemaname = 'app'");
    expect(calls[7][0]).toContain('ORDER BY pg_total_relation_size(relid) DESC');

    // Materialized view stats query
    expect(calls[8][0]).toContain('m.matviewname as view_name');
    expect(calls[8][0]).toContain('m.ispopulated as is_populated');
    expect(calls[8][0]).toContain('FROM pg_matviews m');
    expect(calls[8][0]).toContain("WHERE m.schemaname = 'app'");

    // Unused indexes query
    expect(calls[9][0]).toContain('i.relname AS index_name');
    expect(calls[9][0]).toContain('FROM pg_index ix');
    expect(calls[9][0]).toContain("nspname = 'app'");
    expect(calls[9][0]).toContain('ix.indisunique = false');
    expect(calls[9][0]).toContain('ix.indisprimary = false');

    // Unique/primary key indexes query
    expect(calls[10][0]).toContain('i.relname AS index_name');
    expect(calls[10][0]).toContain('FROM pg_index ix');
    expect(calls[10][0]).toContain("nspname = 'app'");
    expect(calls[10][0]).toContain('ix.indisunique = true');

    // Duplicate indexes query
    expect(calls[11][0]).toContain('indrelid::regclass::text AS table_name');
    expect(calls[11][0]).toContain('array_agg(pg_index.indexrelid::regclass::text');
    expect(calls[11][0]).toContain('FROM pg_index');
    expect(calls[11][0]).toContain('GROUP BY');
    expect(calls[11][0]).toContain('HAVING count(*) > 1');

    // Used indexes query
    expect(calls[12][0]).toContain('indexrelname as index_name');
    expect(calls[12][0]).toContain('FROM pg_stat_user_indexes');
    expect(calls[12][0]).toContain("schemaname = 'app'");
    expect(calls[12][0]).toContain('idx_scan > 0');
    expect(calls[12][0]).toContain("indexrelname NOT LIKE '%_pkey'");
    expect(calls[12][0]).toContain('LIMIT 50');
  });

  test('getDetailedDatabaseStats handles missing total_size', async () => {
    (adminQuery as jest.Mock).mockImplementation(async (queryStr: string) => {
      if (queryStr.includes('pg_database_size')) {
        return { rows: [{}] };
      }
      return { rows: [] };
    });

    const stats = await getDetailedDatabaseStats();
    expect(stats.total_db_size).toBe('Unknown');
  });

  test('getDetailedDatabaseStats handles missing total_size row', async () => {
    (adminQuery as jest.Mock).mockImplementation(async (queryStr: string) => {
      if (queryStr.includes('pg_database_size')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const stats = await getDetailedDatabaseStats();
    expect(stats.total_db_size).toBe('Unknown');
  });

  test('getDetailedDatabaseStats throws and logs error on failure', async () => {
    (adminQuery as jest.Mock).mockRejectedValue(new Error('DB Error'));
    await expect(getDetailedDatabaseStats()).rejects.toThrow('DB Error');
    expect(logger.error).toHaveBeenCalled();
  });
});

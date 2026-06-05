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

    const duplicateIndexQuery = (adminQuery as jest.Mock).mock.calls
      .map(([query]) => String(query))
      .find(
        (query) => query.includes('duplicate_index_groups') || query.includes('HAVING count(*) > 1')
      );
    expect(duplicateIndexQuery).toContain('array_agg(pg_index.indexrelid::regclass::text');
    expect(duplicateIndexQuery).not.toContain('array_agg(indexrelid::regclass::text');
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

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
    (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [{ total_size: '100MB' }] });
    (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [{ table_name: 'test' }] });
    (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [] });
    (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [] });

    const stats = await getDetailedDatabaseStats();
    expect(stats.total_db_size).toBe('100MB');
    expect(stats.tables).toHaveLength(1);
    expect(stats.success).toBe(true);
  });

  test('getDetailedDatabaseStats throws and logs error on failure', async () => {
    (adminQuery as jest.Mock).mockRejectedValue(new Error('DB Error'));
    await expect(getDetailedDatabaseStats()).rejects.toThrow('DB Error');
    expect(logger.error).toHaveBeenCalled();
  });
});

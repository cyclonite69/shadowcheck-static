export {};

const mockAdminQuery = jest.fn();

jest.mock('../../server/src/services/adminDbService', () => ({
  adminQuery: (...args: any[]) => mockAdminQuery(...args),
}));

describe('siblingDetectionAdminService', () => {
  beforeEach(() => {
    jest.resetModules();
    mockAdminQuery.mockReset();
  });

  it('runs cursor-based chunks and stops when no more seeds exist', async () => {
    const service = require('../../server/src/services/admin/siblingDetectionAdminService');

    mockAdminQuery
      .mockResolvedValueOnce({
        rows: [{ seed_count: 3, upserted_count: 4, next_cursor: 'AA:AA:AA:AA:AA:03' }],
      })
      .mockResolvedValueOnce({
        rows: [{ seed_count: 2, upserted_count: 1, next_cursor: 'AA:AA:AA:AA:AA:05' }],
      })
      .mockResolvedValueOnce({
        rows: [{ seed_count: 0, upserted_count: 0, next_cursor: null }],
      });

    const result = await service.runSiblingRefreshJob({ batchSize: 100 });

    expect(result.success).toBe(true);
    expect(result.completed).toBe(true);
    expect(result.batchesRun).toBe(2);
    expect(result.seedsProcessed).toBe(5);
    expect(result.rowsUpserted).toBe(5);
    expect(result.lastCursor).toBe('AA:AA:AA:AA:AA:05');
    expect(mockAdminQuery).toHaveBeenCalledTimes(3);
    expect(String(mockAdminQuery.mock.calls[0][0])).toContain('find_sibling_radios');
  });

  it('honors maxBatches and returns completed=false when truncated', async () => {
    const service = require('../../server/src/services/admin/siblingDetectionAdminService');

    mockAdminQuery.mockResolvedValue({
      rows: [{ seed_count: 3, upserted_count: 2, next_cursor: 'AA:AA:AA:AA:AA:03' }],
    });

    const result = await service.runSiblingRefreshJob({ batchSize: 50, maxBatches: 1 });

    expect(result.success).toBe(true);
    expect(result.completed).toBe(false);
    expect(result.batchesRun).toBe(1);
    expect(result.seedsProcessed).toBe(3);
    expect(result.rowsUpserted).toBe(2);
    expect(mockAdminQuery).toHaveBeenCalledTimes(1);
  });

  it('returns sibling stats from network_sibling_pairs', async () => {
    const service = require('../../server/src/services/admin/siblingDetectionAdminService');
    mockAdminQuery.mockResolvedValueOnce({
      rows: [{ total_pairs: 48, active_pairs: 48, strong_pairs: 23, candidate_pairs: 25 }],
    });

    const stats = await service.getSiblingStats();

    expect(stats.total_pairs).toBe(48);
    expect(stats.strong_pairs).toBe(23);
    expect(String(mockAdminQuery.mock.calls[0][0])).toContain('FROM app.network_sibling_pairs');
  });
});

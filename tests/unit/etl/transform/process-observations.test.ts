const mockQuery = jest.fn();
const mockEnd = jest.fn();

jest.mock('../../../../etl/utils/db', () => ({
  createPool: jest.fn().mockImplementation(() => ({
    query: (...args: any[]) => mockQuery(...args),
    end: (...args: any[]) => mockEnd(...args),
  })),
}));

import {
  normalizeObservations,
  deduplicateObservations,
  main,
} from '../../../../etl/transform/process-observations';

describe('process-observations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('normalizeObservations', () => {
    it('should normalize observations successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 5 } as any); // [1/4] standardizing BSSID
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '10' }] } as any); // [2/3] validating coordinates
      mockQuery.mockResolvedValueOnce({
        rows: [
          { radio_type: 'W', count: '100' },
          { radio_type: 'E', count: '50' },
        ],
      } as any); // [3/3] validating radio types

      await expect(normalizeObservations()).resolves.toBeUndefined();
      expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it('should throw and log if pool.query fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB Error'));

      await expect(normalizeObservations()).rejects.toThrow('DB Error');
      expect(console.error).toHaveBeenCalledWith('❌ Normalization failed:', 'DB Error');
    });
  });

  describe('deduplicateObservations', () => {
    it('should deduplicate observations successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '100' }] } as any); // beforeCount
      mockQuery.mockResolvedValueOnce({} as any); // DELETE duplicates
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '80' }] } as any); // afterCount

      const result = await deduplicateObservations();

      expect(result).toEqual({
        before: 100,
        after: 80,
        removed: 20,
      });
      expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it('should throw and log if pool.query fails during deduplication', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Deduplication Error'));

      await expect(deduplicateObservations()).rejects.toThrow('Deduplication Error');
      expect(console.error).toHaveBeenCalledWith('❌ Deduplication failed:', 'Deduplication Error');
    });
  });

  describe('main', () => {
    it('should do nothing if isMain is false', async () => {
      await main(false);
      expect(mockQuery).not.toHaveBeenCalled();
      expect(mockEnd).not.toHaveBeenCalled();
    });

    it('should run normalize and deduplicate if isMain is true', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 5 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '10' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      mockQuery.mockResolvedValueOnce({ rows: [{ count: '100' }] } as any);
      mockQuery.mockResolvedValueOnce({} as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '100' }] } as any);

      await main(true);

      expect(mockQuery).toHaveBeenCalledTimes(6);
      expect(mockEnd).toHaveBeenCalledTimes(1);
    });
  });
});

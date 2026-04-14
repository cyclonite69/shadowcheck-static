/**
 * Core Analytics Unit Tests
 */

export {};

const { query } = require('../../../../server/src/config/database');
const coreAnalytics = require('../../../../server/src/services/analytics/coreAnalytics');
const { DatabaseError } = require('../../../../server/src/errors/AppError');

jest.mock('../../../../server/src/config/database', () => ({
  query: jest.fn(),
}));

describe('Core Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSignalStrengthDistribution()', () => {
    it('should return signal distribution', async () => {
      const mockRows = [
        { signal_range: '-30', count: '5' },
        { signal_range: '-40', count: '15' },
      ];
      query.mockResolvedValueOnce({ rows: mockRows });

      const result = await coreAnalytics.getSignalStrengthDistribution();

      expect(result).toEqual([
        { range: '-30', count: 5 },
        { range: '-40', count: 15 },
      ]);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
      expect(query).toHaveBeenCalledWith(expect.stringContaining('bestlevel'));
    });

    it('should throw DatabaseError on query failure', async () => {
      query.mockRejectedValueOnce(new Error('DB Error'));
      await expect(coreAnalytics.getSignalStrengthDistribution()).rejects.toThrow(DatabaseError);
    });
  });

  describe('getTemporalActivity()', () => {
    it('should return temporal activity based on minTimestamp', async () => {
      const minTimestamp = 1600000000000;
      const mockRows = [
        { hour: '10', count: '100' },
        { hour: '11', count: '120' },
      ];
      query.mockResolvedValueOnce({ rows: mockRows });

      const result = await coreAnalytics.getTemporalActivity(minTimestamp);

      expect(result).toEqual([
        { hour: 10, count: 100 },
        { hour: 11, count: 120 },
      ]);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('EXTRACT(HOUR FROM o.time)'), [
        minTimestamp,
      ]);
    });

    it('should throw DatabaseError on query failure', async () => {
      query.mockRejectedValueOnce(new Error('DB Error'));
      await expect(coreAnalytics.getTemporalActivity(0)).rejects.toThrow(DatabaseError);
    });
  });

  describe('getRadioTypeOverTime()', () => {
    it('should return radio type distribution over time', async () => {
      const range = '24h';
      const minTimestamp = 1600000000000;
      const mockRows = [
        { date: '2023-01-01T10:00:00Z', network_type: 'WiFi', count: '50' },
        { date: '2023-01-01T10:00:00Z', network_type: 'BLE', count: '20' },
      ];
      query.mockResolvedValueOnce({ rows: mockRows });

      const result = await coreAnalytics.getRadioTypeOverTime(range, minTimestamp);

      expect(result).toEqual([
        { date: '2023-01-01T10:00:00Z', type: 'WiFi', count: 50 },
        { date: '2023-01-01T10:00:00Z', type: 'BLE', count: 20 },
      ]);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('WITH time_counts AS'), [
        range,
        minTimestamp,
      ]);
    });

    it('should verify SQL structure for different ranges', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      await coreAnalytics.getRadioTypeOverTime('all', 0);

      const lastCallSql = query.mock.calls[0][0];
      expect(lastCallSql).toContain("WHEN 'all' THEN DATE_TRUNC('week', o.time)");
      expect(lastCallSql).toContain("WHEN '24h' THEN DATE_TRUNC('hour', o.time)");
    });

    it('should throw DatabaseError on query failure', async () => {
      query.mockRejectedValueOnce(new Error('DB Error'));
      await expect(coreAnalytics.getRadioTypeOverTime('24h', 0)).rejects.toThrow(DatabaseError);
    });
  });
});

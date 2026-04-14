/**
 * Threat Analytics Unit Tests
 */

export {};

const { query } = require('../../../../server/src/config/database');
const threatAnalytics = require('../../../../server/src/services/analytics/threatAnalytics');
const { DatabaseError } = require('../../../../server/src/errors/AppError');

jest.mock('../../../../server/src/config/database', () => ({
  query: jest.fn(),
}));

describe('Threat Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getThreatDistribution()', () => {
    it('should return threat score distribution', async () => {
      const mockRows = [
        { range: '80-100', count: '5' },
        { range: '60-80', count: '10' },
      ];
      query.mockResolvedValueOnce({ rows: mockRows });

      const result = await threatAnalytics.getThreatDistribution();

      expect(result).toEqual([
        { range: '80-100', count: 5 },
        { range: '60-80', count: 10 },
      ]);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('final_threat_score'));
    });

    it('should throw DatabaseError on query failure', async () => {
      query.mockRejectedValueOnce(new Error('DB Error'));
      await expect(threatAnalytics.getThreatDistribution()).rejects.toThrow(DatabaseError);
    });
  });

  describe('getThreatTrends()', () => {
    it('should return threat trends over time', async () => {
      const range = '7d';
      const minTimestamp = 1600000000000;
      const mockRows = [
        {
          date: '2023-01-01',
          avg_score: '45.5',
          critical_count: '2',
          high_count: '5',
          medium_count: '10',
          low_count: '20',
          network_count: '37',
        },
      ];
      query.mockResolvedValueOnce({ rows: mockRows });

      const result = await threatAnalytics.getThreatTrends(range, minTimestamp);

      expect(result).toEqual([
        {
          date: '2023-01-01',
          avgScore: '45.5',
          criticalCount: 2,
          highCount: 5,
          mediumCount: 10,
          lowCount: 20,
          networkCount: 37,
        },
      ]);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('WITH daily_threats AS'), [
        range,
        minTimestamp,
      ]);
    });

    it('should verify SQL structure for trend aggregations', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      await threatAnalytics.getThreatTrends('24h', 0);

      const lastCallSql = query.mock.calls[0][0];
      expect(lastCallSql).toContain('ROUND(AVG(threat_score::numeric), 1)');
      expect(lastCallSql).toContain(
        'COUNT(CASE WHEN threat_score::numeric >= 80 THEN 1 END) as critical_count'
      );
    });

    it('should handle null avg_score', async () => {
      const mockRows = [
        {
          date: '2023-01-01',
          avg_score: null,
          critical_count: '0',
          high_count: '0',
          medium_count: '0',
          low_count: '0',
          network_count: '0',
        },
      ];
      query.mockResolvedValueOnce({ rows: mockRows });

      const result = await threatAnalytics.getThreatTrends('24h', 0);
      expect(result[0].avgScore).toBeNull();
    });

    it('should throw DatabaseError on query failure', async () => {
      query.mockRejectedValueOnce(new Error('DB Error'));
      await expect(threatAnalytics.getThreatTrends('24h', 0)).rejects.toThrow(DatabaseError);
    });
  });
});

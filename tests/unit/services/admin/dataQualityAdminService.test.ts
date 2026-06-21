import { DataQualityAdminService } from '../../../../server/src/services/admin/dataQualityAdminService';
import { Pool } from 'pg';
import logger from '../../../../server/src/logging/logger';

jest.mock('pg');
jest.mock('../../../../server/src/logging/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('DataQualityAdminService', () => {
  let service: DataQualityAdminService;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = new Pool() as jest.Mocked<Pool>;
    mockPool.query = jest.fn() as any;
    service = new DataQualityAdminService(mockPool);
  });

  describe('getQualityStats', () => {
    it('should return quality statistics', async () => {
      const mockResult = {
        rows: [
          {
            total_observations: '100',
            temporal_clusters: '10',
            duplicate_coords: '5',
            extreme_signals: '2',
            total_filtered: '17',
            last_applied: new Date('2023-01-01'),
          },
        ],
      };
      (mockPool.query as jest.Mock).mockResolvedValueOnce(mockResult);

      const stats = await service.getQualityStats();

      expect(stats).toEqual({
        totalObservations: 100,
        temporalClusters: 10,
        duplicateCoords: 5,
        extremeSignals: 2,
        totalFiltered: 17,
        lastApplied: mockResult.rows[0].last_applied,
      });

      expect(mockPool.query).toHaveBeenCalled();
      const [sql, params] = (mockPool.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('SELECT');
      expect(sql).toContain('COUNT(*) as total_observations');
      expect(sql).toContain(
        'COUNT(*) FILTER (WHERE is_temporal_cluster = true) as temporal_clusters'
      );
      expect(sql).toContain(
        'COUNT(*) FILTER (WHERE is_duplicate_coord = true) as duplicate_coords'
      );
      expect(sql).toContain('COUNT(*) FILTER (WHERE is_extreme_signal = true) as extreme_signals');
      expect(sql).toContain('COUNT(*) FILTER (WHERE is_quality_filtered = true) as total_filtered');
      expect(sql).toContain('MAX(quality_filter_applied_at) as last_applied');
      expect(sql).toContain('FROM observations');
      expect(params).toBeUndefined();
    });

    it('should handle missing values with defaults', async () => {
      const mockResult = {
        rows: [
          {
            total_observations: '0',
            temporal_clusters: null,
            duplicate_coords: null,
            extreme_signals: null,
            total_filtered: null,
            last_applied: null,
          },
        ],
      };
      (mockPool.query as jest.Mock).mockResolvedValueOnce(mockResult);

      const stats = await service.getQualityStats();

      expect(stats).toEqual({
        totalObservations: 0,
        temporalClusters: 0,
        duplicateCoords: 0,
        extremeSignals: 0,
        totalFiltered: 0,
        lastApplied: null,
      });
    });
  });

  describe('getQualityConfig', () => {
    it('should return config from DB', async () => {
      const mockConfig = {
        enabled: true,
        temporalThreshold: 30,
        duplicateThreshold: 500,
        signalMin: -110,
        signalMax: -10,
      };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ config_value: JSON.stringify(mockConfig) }],
      });

      const config = await service.getQualityConfig();

      expect(config).toEqual(mockConfig);

      expect(mockPool.query).toHaveBeenCalled();
      const [sql, params] = (mockPool.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('SELECT config_value');
      expect(sql).toContain('FROM app.settings');
      expect(sql).toContain("WHERE config_key = 'quality_filter_config'");
      expect(params).toBeUndefined();
    });

    it('should return defaults if no config in DB', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const config = await service.getQualityConfig();

      expect(config).toEqual({
        enabled: false,
        temporalThreshold: 50,
        duplicateThreshold: 1000,
        signalMin: -120,
        signalMax: 0,
      });
    });
  });

  describe('updateQualityConfig', () => {
    it('should update config and log success', async () => {
      const mockConfig = {
        enabled: true,
        temporalThreshold: 30,
        duplicateThreshold: 500,
        signalMin: -110,
        signalMax: -10,
      };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

      await service.updateQualityConfig(mockConfig);

      expect(mockPool.query).toHaveBeenCalled();
      const [sql, params] = (mockPool.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('INSERT INTO app.settings (config_key, config_value)');
      expect(sql).toContain("VALUES ('quality_filter_config', $1)");
      expect(sql).toContain('ON CONFLICT (config_key)');
      expect(sql).toContain('DO UPDATE SET config_value = $1, updated_at = NOW()');
      expect(params).toEqual([JSON.stringify(mockConfig)]);
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('applyQualityFilters', () => {
    it('should apply filters and return new stats', async () => {
      const mockConfig = {
        enabled: true,
        temporalThreshold: 30,
        duplicateThreshold: 500,
        signalMin: -110,
        signalMax: -10,
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ config_value: JSON.stringify(mockConfig) }] }) // getQualityConfig
        .mockResolvedValueOnce({ rowCount: 1 }) // Mark temporal clusters
        .mockResolvedValueOnce({ rowCount: 1 }) // Mark duplicate coordinates
        .mockResolvedValueOnce({ rowCount: 1 }) // Mark extreme signals
        .mockResolvedValueOnce({ rowCount: 0 }) // refreshExplorerMv
        .mockResolvedValueOnce({
          // getQualityStats
          rows: [
            {
              total_observations: '100',
              temporal_clusters: '10',
              duplicate_coords: '5',
              extreme_signals: '2',
              total_filtered: '17',
              last_applied: new Date(),
            },
          ],
        });

      const stats = await service.applyQualityFilters();

      expect(stats.totalObservations).toBe(100);

      const calls = (mockPool.query as jest.Mock).mock.calls;
      expect(calls).toHaveLength(6);

      // getQualityConfig query
      expect(calls[0][0]).toContain('SELECT config_value');
      expect(calls[0][0]).toContain('FROM app.settings');

      // Temporal clusters update query
      expect(calls[1][0]).toContain('UPDATE observations o');
      expect(calls[1][0]).toContain('is_temporal_cluster = true');
      expect(calls[1][0]).toContain('is_quality_filtered = true');
      expect(calls[1][0]).toContain('quality_filter_applied_at = NOW()');
      expect(calls[1][0]).toContain('WHERE (time, lat, lon) IN (');
      expect(calls[1][0]).toContain('SELECT time, lat, lon');
      expect(calls[1][0]).toContain('FROM observations');
      expect(calls[1][0]).toContain('GROUP BY time, lat, lon');
      expect(calls[1][0]).toContain('HAVING COUNT(*) > $1');
      expect(calls[1][1]).toEqual([30]);

      // Duplicate coordinates update query
      expect(calls[2][0]).toContain('UPDATE observations o');
      expect(calls[2][0]).toContain('is_duplicate_coord = true');
      expect(calls[2][0]).toContain('is_quality_filtered = true');
      expect(calls[2][0]).toContain('quality_filter_applied_at = NOW()');
      expect(calls[2][0]).toContain('WHERE (lat, lon) IN (');
      expect(calls[2][0]).toContain('SELECT lat, lon');
      expect(calls[2][0]).toContain('FROM observations');
      expect(calls[2][0]).toContain('GROUP BY lat, lon');
      expect(calls[2][0]).toContain('HAVING COUNT(*) > $1');
      expect(calls[2][1]).toEqual([500]);

      // Extreme signals update query
      expect(calls[3][0]).toContain('UPDATE observations');
      expect(calls[3][0]).toContain('is_extreme_signal = true');
      expect(calls[3][0]).toContain('is_quality_filtered = true');
      expect(calls[3][0]).toContain('quality_filter_applied_at = NOW()');
      expect(calls[3][0]).toContain('WHERE level NOT BETWEEN $1 AND $2');
      expect(calls[3][1]).toEqual([-110, -10]);

      // Refresh Materialized View query
      expect(calls[4][0]).toEqual('REFRESH MATERIALIZED VIEW app.api_network_explorer_mv');
      expect(calls[4][1]).toBeUndefined();

      // getQualityStats query
      expect(calls[5][0]).toContain('SELECT');
      expect(calls[5][0]).toContain('COUNT(*) as total_observations');
    });

    it('should throw if disabled', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ config_value: JSON.stringify({ enabled: false }) }],
      });

      await expect(service.applyQualityFilters()).rejects.toThrow('Quality filters are disabled');
    });
  });

  describe('clearQualityFlags', () => {
    it('should reset flags and refresh MV', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rowCount: 0 }); // REFRESH

      await service.clearQualityFlags();

      const calls = (mockPool.query as jest.Mock).mock.calls;
      expect(calls).toHaveLength(2);

      expect(calls[0][0]).toContain('UPDATE observations');
      expect(calls[0][0]).toContain('is_temporal_cluster = false');
      expect(calls[0][0]).toContain('is_duplicate_coord = false');
      expect(calls[0][0]).toContain('is_extreme_signal = false');
      expect(calls[0][0]).toContain('is_quality_filtered = false');
      expect(calls[0][0]).toContain('quality_filter_applied_at = NULL');
      expect(calls[0][1]).toBeUndefined();

      expect(calls[1][0]).toEqual('REFRESH MATERIALIZED VIEW app.api_network_explorer_mv');
      expect(calls[1][1]).toBeUndefined();
    });
  });
});

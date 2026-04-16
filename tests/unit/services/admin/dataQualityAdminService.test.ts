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

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO app.settings'),
        [JSON.stringify(mockConfig)]
      );
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
        .mockResolvedValueOnce({ // getQualityStats
          rows: [{
            total_observations: '100',
            temporal_clusters: '10',
            duplicate_coords: '5',
            extreme_signals: '2',
            total_filtered: '17',
            last_applied: new Date(),
          }],
        });

      const stats = await service.applyQualityFilters();

      expect(stats.totalObservations).toBe(100);
      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('REFRESH MATERIALIZED VIEW'));
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

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE observations'));
      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('REFRESH MATERIALIZED VIEW'));
    });
  });
});

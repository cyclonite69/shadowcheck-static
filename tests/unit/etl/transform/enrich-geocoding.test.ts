import {
  enrichGeocoding,
  parseNumberArg,
  parseStringArg,
  parseArgs,
  toNumber,
  printStats,
} from '../../../../etl/transform/enrich-geocoding';

const mockRunGeocodeCacheUpdate = jest.fn();
const mockGetGeocodingCacheStats = jest.fn();

jest.mock('../../../../server/src/services/geocodingCacheService', () => ({
  runGeocodeCacheUpdate: (...args: any[]) => mockRunGeocodeCacheUpdate(...args),
  getGeocodingCacheStats: (...args: any[]) => mockGetGeocodingCacheStats(...args),
}));

jest.mock('../../../../etl/utils/deadLetter', () => ({
  logDeadLetter: jest.fn(),
}));

describe('enrichGeocoding unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseNumberArg', () => {
    test('parses correctly', () => {
      expect(parseNumberArg(['--limit=500'], '--limit=', 100)).toBe(500);
      expect(parseNumberArg(['--something=abc'], '--limit=', 100)).toBe(100);
      expect(parseNumberArg(['--limit=-10'], '--limit=', 100)).toBe(100);
      expect(parseNumberArg(['--limit=abc'], '--limit=', 100)).toBe(100);
    });
  });

  describe('parseStringArg', () => {
    test('parses correctly', () => {
      expect(parseStringArg(['--provider=mapbox'], '--provider=')).toBe('mapbox');
      expect(parseStringArg(['--something=abc'], '--provider=')).toBeNull();
      expect(parseStringArg(['--provider='], '--provider=')).toBeNull();
    });
  });

  describe('parseArgs', () => {
    test('returns default options', () => {
      const opts = parseArgs([]);
      expect(opts).toEqual({
        provider: 'mapbox',
        mode: 'address-only',
        limit: 1000,
        precision: 5,
        perMinute: 200,
        permanent: false,
        dryRun: true,
      });
    });

    test('parses custom arguments', () => {
      const opts = parseArgs([
        '--provider=nominatim',
        '--mode=poi-only',
        '--limit=50',
        '--precision=6',
        '--per-minute=30',
        '--permanent',
        '--live',
      ]);
      expect(opts).toEqual({
        provider: 'nominatim',
        mode: 'poi-only',
        limit: 50,
        precision: 6,
        perMinute: 30,
        permanent: true,
        dryRun: false,
      });
    });
  });

  describe('toNumber', () => {
    test('converts correctly', () => {
      expect(toNumber(42)).toBe(42);
      expect(toNumber('100')).toBe(100);
      expect(toNumber('abc')).toBe(0);
    });
  });

  describe('printStats', () => {
    test('prints stats to console', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      printStats('Test Label', {
        observation_count: '1000',
        unique_blocks: 100,
        cached_blocks: '50',
        cached_with_address: 30,
        cached_with_poi: '20',
        distinct_addresses: 15,
        missing_blocks: 50,
      });
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('enrichGeocoding', () => {
    test('runs in dryRun mode by default without calling update service', async () => {
      const statsBefore = {
        observation_count: 100,
        unique_blocks: 10,
        cached_blocks: 5,
        cached_with_address: 3,
        cached_with_poi: 2,
        distinct_addresses: 3,
        missing_blocks: 5,
      };
      mockGetGeocodingCacheStats.mockResolvedValue(statsBefore);

      const options = {
        provider: 'mapbox' as const,
        mode: 'address-only' as const,
        limit: 100,
        precision: 5,
        perMinute: 200,
        permanent: false,
        dryRun: true,
      };

      await enrichGeocoding(options);

      expect(mockGetGeocodingCacheStats).toHaveBeenCalledWith(5);
      expect(mockRunGeocodeCacheUpdate).not.toHaveBeenCalled();
    });

    test('runs in live mode with mapbox provider', async () => {
      const statsBefore = {
        observation_count: 100,
        unique_blocks: 10,
        cached_blocks: 5,
        cached_with_address: 3,
        cached_with_poi: 2,
        distinct_addresses: 3,
        missing_blocks: 5,
      };
      const statsAfter = {
        ...statsBefore,
        cached_blocks: 8,
        missing_blocks: 2,
      };
      mockGetGeocodingCacheStats
        .mockResolvedValueOnce(statsBefore)
        .mockResolvedValueOnce(statsAfter);

      mockRunGeocodeCacheUpdate.mockResolvedValue({
        provider: 'mapbox',
        mode: 'address-only',
        processed: 3,
        successful: 3,
        poiHits: 0,
        rateLimited: 0,
        durationMs: 1500,
      });

      const options = {
        provider: 'mapbox' as const,
        mode: 'address-only' as const,
        limit: 100,
        precision: 5,
        perMinute: 200,
        permanent: true,
        dryRun: false,
      };

      await enrichGeocoding(options);

      expect(mockGetGeocodingCacheStats).toHaveBeenCalledTimes(2);
      expect(mockRunGeocodeCacheUpdate).toHaveBeenCalledWith({
        provider: 'mapbox',
        mode: 'address-only',
        limit: 100,
        precision: 5,
        perMinute: 200,
        permanent: true,
      });
    });

    test('runs in live mode with non-mapbox provider (nominatim)', async () => {
      const statsBefore = {
        observation_count: 100,
        unique_blocks: 10,
        cached_blocks: 5,
        cached_with_address: 3,
        cached_with_poi: 2,
        distinct_addresses: 3,
        missing_blocks: 5,
      };
      mockGetGeocodingCacheStats.mockResolvedValue(statsBefore);
      mockRunGeocodeCacheUpdate.mockResolvedValue({
        provider: 'nominatim',
        mode: 'poi-only',
        processed: 2,
        successful: 2,
        poiHits: 1,
        rateLimited: 0,
        durationMs: 2000,
      });

      const options = {
        provider: 'nominatim' as const,
        mode: 'poi-only' as const,
        limit: 50,
        precision: 6,
        perMinute: 60,
        permanent: false,
        dryRun: false,
      };

      await enrichGeocoding(options);

      expect(mockRunGeocodeCacheUpdate).toHaveBeenCalledWith({
        provider: 'nominatim',
        mode: 'poi-only',
        limit: 50,
        precision: 6,
        perMinute: 60,
        permanent: false,
      });
    });

    test('handles errors from geocoding cache update and logs to dead letter', async () => {
      const statsBefore = {
        observation_count: 100,
        unique_blocks: 10,
        cached_blocks: 5,
        cached_with_address: 3,
        cached_with_poi: 2,
        distinct_addresses: 3,
        missing_blocks: 5,
      };
      mockGetGeocodingCacheStats.mockResolvedValue(statsBefore);
      mockRunGeocodeCacheUpdate.mockRejectedValue(new Error('Update failed'));

      const options = {
        provider: 'mapbox' as const,
        mode: 'address-only' as const,
        limit: 100,
        precision: 5,
        perMinute: 200,
        permanent: false,
        dryRun: false,
      };

      await enrichGeocoding(options);

      const { logDeadLetter } = require('../../../../etl/utils/deadLetter');
      expect(logDeadLetter).toHaveBeenCalledWith(
        expect.objectContaining({ options }),
        'Enrichment failed: Update failed'
      );
    });
  });
});

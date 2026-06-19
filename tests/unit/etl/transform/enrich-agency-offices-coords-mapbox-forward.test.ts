const mockQuery = jest.fn();
const mockEnd = jest.fn();
const mockLookup = jest.fn();
const mockGetSecret = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn(),
}));

jest.mock('dns/promises', () => ({
  lookup: (...args: any[]) => mockLookup(...args),
}));

jest.mock('../../../../server/src/services/secretsManager', () => ({
  getSecret: (...args: any[]) => mockGetSecret(...args),
}));

import {
  main,
  parseArgs,
  resolveDbHost,
  loadSecretsManager,
  buildQuery,
  mapboxForward,
  normalizeZip5,
} from '../../../../etl/transform/enrich-agency-offices-coords-mapbox-forward';
import { Pool } from 'pg';

describe('enrich-agency-offices-coords-mapbox-forward', () => {
  const originalEnv = { ...process.env };
  const originalArgv = [...process.argv];

  beforeEach(() => {
    jest.clearAllMocks();
    (Pool as unknown as jest.Mock).mockImplementation(() => ({
      query: (...args: any[]) => mockQuery(...args),
      end: (...args: any[]) => mockEnd(...args),
    }));
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = jest.fn();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = originalEnv;
    process.argv = originalArgv;
  });

  describe('normalizeZip5', () => {
    test('returns null for null or empty', () => {
      expect(normalizeZip5(null)).toBeNull();
      expect(normalizeZip5('')).toBeNull();
      expect(normalizeZip5('   ')).toBeNull();
    });

    test('extracts zip5', () => {
      expect(normalizeZip5('12345')).toBe('12345');
      expect(normalizeZip5('12345-6789')).toBe('12345');
      expect(normalizeZip5('abc')).toBeNull();
    });
  });

  describe('parseArgs', () => {
    test('returns default options', () => {
      const opts = parseArgs([]);
      expect(opts).toEqual({
        dryRun: true,
        agency: 'FBI',
        states: null,
        limit: 500,
        sleepMs: 150,
        permanent: false,
      });
    });

    test('parses custom arguments', () => {
      const opts = parseArgs([
        '--live',
        '--agency=DEA',
        '--states=CA,NY',
        '--limit=100',
        '--sleep-ms=300',
        '--permanent',
      ]);
      expect(opts).toEqual({
        dryRun: false,
        agency: 'DEA',
        states: ['CA', 'NY'],
        limit: 100,
        sleepMs: 300,
        permanent: true,
      });
    });

    test('parses alternative live syntax', () => {
      const opts = parseArgs(['--live=true']);
      expect(opts.dryRun).toBe(false);
    });
  });

  describe('resolveDbHost', () => {
    test('uses DB_HOST and resolves via dns', async () => {
      process.env.DB_HOST = 'custom_host';
      mockLookup.mockResolvedValueOnce({});
      const host = await resolveDbHost();
      expect(host).toBe('custom_host');
      expect(mockLookup).toHaveBeenCalledWith('custom_host');
    });

    test('falls back to localhost on dns failure', async () => {
      process.env.DB_HOST = 'custom_host';
      mockLookup.mockRejectedValueOnce(new Error('fail'));
      const host = await resolveDbHost();
      expect(host).toBe('localhost');
    });

    test('defaults to localhost if configured is shadowcheck_postgres', async () => {
      process.env.DB_HOST = 'shadowcheck_postgres';
      const host = await resolveDbHost();
      expect(host).toBe('localhost');
    });
  });

  describe('loadSecretsManager', () => {
    test('loads successfully', async () => {
      const sm = await loadSecretsManager();
      expect(sm.getSecret).toBeDefined();
    });
  });

  describe('buildQuery', () => {
    test('builds query with standard address', () => {
      const row = {
        id: 1,
        agency: 'FBI',
        office_type: 'FO',
        name: 'Office',
        address_line1: '123 Main St',
        address_line2: null,
        city: 'City',
        state: 'CA',
        postal_code: '12345',
        normalized_address_line1: null,
        normalized_address_line2: null,
        normalized_city: null,
        normalized_state: null,
        normalized_postal_code: null,
        latitude: null,
        longitude: null,
        location: null,
      };
      expect(buildQuery(row)).toBe('123 Main St, City, CA 12345, USA');
    });

    test('uses normalized values over raw values if present', () => {
      const row = {
        id: 1,
        agency: 'FBI',
        office_type: 'FO',
        name: 'Office',
        address_line1: '123 Main St',
        address_line2: 'Suite A',
        city: 'City',
        state: 'CA',
        postal_code: '12345',
        normalized_address_line1: '123 Main Street',
        normalized_address_line2: 'Ste A',
        normalized_city: 'New City',
        normalized_state: 'NY',
        normalized_postal_code: '54321',
        latitude: null,
        longitude: null,
        location: null,
      };
      expect(buildQuery(row)).toBe('123 Main Street, Ste A, New City, NY 54321, USA');
    });
  });

  describe('mapboxForward', () => {
    test('returns coordinates on success', async () => {
      const mockResponse = {
        features: [
          {
            center: [-122.4194, 37.7749],
            place_name: 'San Francisco, CA',
            place_type: ['place'],
            relevance: 1.0,
            properties: { accuracy: 'rooftop' },
          },
        ],
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const res = await mapboxForward({ token: 'test', query: 'SF', permanent: true });
      expect(res).toEqual({
        lat: 37.7749,
        lon: -122.4194,
        feature: mockResponse.features[0],
      });
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('permanent=true'));
    });

    test('returns null if response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });
      const res = await mapboxForward({ token: 'test', query: 'SF', permanent: false });
      expect(res).toBeNull();
    });

    test('throws rate_limit on 429', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 429,
      });
      await expect(mapboxForward({ token: 'test', query: 'SF', permanent: false })).rejects.toThrow(
        'rate_limit'
      );
    });
  });

  describe('main', () => {
    test('exits early in dry-run mode', async () => {
      process.argv = ['node', 'script.js', '--dry-run'];
      mockGetSecret.mockResolvedValueOnce('db_pass').mockResolvedValueOnce('token');
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, agency: 'FBI', name: 'Office' }] });

      await main();

      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    test('runs live forward geocoding loop and updates DB', async () => {
      process.argv = ['node', 'script.js', '--live', '--sleep-ms=1'];
      mockGetSecret.mockResolvedValueOnce('db_pass').mockResolvedValueOnce('token');

      const candidateRow = {
        id: 1,
        agency: 'FBI',
        office_type: 'FO',
        name: 'Office',
        address_line1: '123 Main St',
        address_line2: null,
        city: 'City',
        state: 'CA',
        postal_code: '12345',
        latitude: null,
        longitude: null,
        location: null,
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [candidateRow] }) // Selection query
        .mockResolvedValueOnce({ rowCount: 1 }); // Update query

      const mockResponse = {
        features: [
          {
            center: [-122, 37],
            place_name: 'San Francisco, CA',
            place_type: ['place'],
            relevance: 1.0,
            properties: { accuracy: 'rooftop' },
          },
        ],
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await main();

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenLastCalledWith(
        expect.stringContaining('UPDATE app.agency_offices'),
        [1, 37, -122, expect.any(String)]
      );
    });

    test('handles empty results and errors safely', async () => {
      process.argv = ['node', 'script.js', '--live', '--sleep-ms=1'];
      mockGetSecret.mockResolvedValueOnce('db_pass').mockResolvedValueOnce('token');

      const candidateRow = {
        id: 1,
        agency: 'FBI',
        office_type: 'FO',
        name: 'Office',
        address_line1: '123 Main St',
        address_line2: null,
        city: 'City',
        state: 'CA',
        postal_code: '12345',
        latitude: null,
        longitude: null,
        location: null,
      };

      mockQuery.mockResolvedValueOnce({ rows: [candidateRow, { ...candidateRow, id: 2 }] }); // Selection query returns 2 rows

      // First fetch: rate limit error
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          status: 429,
        })
        // Second fetch: no features found
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ features: [] }),
        });

      await main();

      expect(mockQuery).toHaveBeenCalledTimes(1); // No updates called
    });
  });
});

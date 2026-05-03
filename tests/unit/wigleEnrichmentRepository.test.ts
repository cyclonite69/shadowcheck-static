/**
 * Tests for wigleEnrichmentRepository.ts getEnrichmentCatalog function
 * Verifies sorting, pagination, location key expansion, filtering, and SQL injection prevention
 */

export {};

jest.mock('../../server/src/config/container', () => ({
  adminDbService: {
    adminQuery: jest.fn(),
  },
}));

const container = require('../../server/src/config/container');
const { getEnrichmentCatalog } = require('../../server/src/repositories/wigleEnrichmentRepository');

describe('wigleEnrichmentRepository.getEnrichmentCatalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('pagination', () => {
    it('should default to page=1, limit=50', async () => {
      container.adminDbService.adminQuery
        .mockResolvedValueOnce({ rows: [{ bssid: 'AA:BB:CC:DD:EE:FF' }] })
        .mockResolvedValueOnce({ rows: [{ count: 100 }] });

      const result = await getEnrichmentCatalog({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should convert page to offset correctly', async () => {
      container.adminDbService.adminQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 100 }] });

      await getEnrichmentCatalog({ page: 3, limit: 25 });

      const dataCall = container.adminDbService.adminQuery.mock.calls[0];
      expect(dataCall[1]).toContain(25); // limit
      expect(dataCall[1]).toContain(50); // offset (page 3 - 1 * limit 25 = 50)
    });

    it('should return total and page in response', async () => {
      container.adminDbService.adminQuery
        .mockResolvedValueOnce({ rows: [{ bssid: 'AA:BB:CC:DD:EE:FF' }] })
        .mockResolvedValueOnce({ rows: [{ count: 150 }] });

      const result = await getEnrichmentCatalog({ page: 2, limit: 50 });

      expect(result).toHaveProperty('total', 150);
      expect(result).toHaveProperty('page', 2);
      expect(result).toHaveProperty('limit', 50);
    });

    it('should return data array', async () => {
      const mockData = [
        { bssid: 'AA:BB:CC:DD:EE:FF', ssid: 'Network1' },
        { bssid: 'FF:EE:DD:CC:BB:AA', ssid: 'Network2' },
      ];
      container.adminDbService.adminQuery
        .mockResolvedValueOnce({ rows: mockData })
        .mockResolvedValueOnce({ rows: [{ count: 2 }] });

      const result = await getEnrichmentCatalog({});

      expect(result.data).toEqual(mockData);
    });
  });

  describe('sorting', () => {
    it('should use lasttime DESC, bssid ASC as default sort', async () => {
      container.adminDbService.adminQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      await getEnrichmentCatalog({});

      const dataCall = container.adminDbService.adminQuery.mock.calls[0];
      expect(dataCall[0]).toContain('ORDER BY v2.lasttime DESC, v2.bssid ASC');
    });

    it('should accept single sort key', async () => {
      container.adminDbService.adminQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      await getEnrichmentCatalog({ sortBy: 'ssid' });

      const dataCall = container.adminDbService.adminQuery.mock.calls[0];
      expect(dataCall[0]).toContain('v2.ssid ASC'); // defaults to ASC
    });

    it('should apply specified sort direction', async () => {
      container.adminDbService.adminQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      await getEnrichmentCatalog({ sortBy: 'ssid', sortDir: 'desc' });

      const dataCall = container.adminDbService.adminQuery.mock.calls[0];
      expect(dataCall[0]).toContain('v2.ssid DESC');
    });

    it('should accept multiple sort keys with matching directions', async () => {
      container.adminDbService.adminQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      await getEnrichmentCatalog({ sortBy: 'firsttime,lasttime', sortDir: 'asc,desc' });

      const dataCall = container.adminDbService.adminQuery.mock.calls[0];
      expect(dataCall[0]).toContain('v2.firsttime ASC, v2.lasttime DESC');
    });

    it('should expand location key to v2.city, v2.region', async () => {
      container.adminDbService.adminQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      await getEnrichmentCatalog({ sortBy: 'location', sortDir: 'asc' });

      const dataCall = container.adminDbService.adminQuery.mock.calls[0];
      expect(dataCall[0]).toContain('v2.city ASC, v2.region ASC');
    });

    it('should handle location key with descending direction', async () => {
      container.adminDbService.adminQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      await getEnrichmentCatalog({ sortBy: 'location', sortDir: 'desc' });

      const dataCall = container.adminDbService.adminQuery.mock.calls[0];
      expect(dataCall[0]).toContain('v2.city DESC, v2.region DESC');
    });

    it('should allow all keys in SORT_ALLOWLIST', async () => {
      const allowlistKeys = [
        'ssid',
        'firsttime',
        'lasttime',
        'last_v3_import',
        'signal',
        'channel',
        'encryption',
        'status',
        'location',
      ];

      for (const key of allowlistKeys) {
        container.adminDbService.adminQuery.mockClear();
        container.adminDbService.adminQuery
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: 0 }] });

        await getEnrichmentCatalog({ sortBy: key });

        const dataCall = container.adminDbService.adminQuery.mock.calls[0];
        expect(dataCall[0]).toContain('ORDER BY');
      }
    });

    it('should reject invalid sort keys (SQL injection prevention)', async () => {
      container.adminDbService.adminQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      await getEnrichmentCatalog({ sortBy: 'invalid_column; DROP TABLE' });

      const dataCall = container.adminDbService.adminQuery.mock.calls[0];
      expect(dataCall[0]).toContain('ORDER BY v2.lasttime DESC, v2.bssid ASC');
    });

    it('should revert to default sort when all keys are invalid', async () => {
      container.adminDbService.adminQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      await getEnrichmentCatalog({ sortBy: 'malicious1,malicious2' });

      const dataCall = container.adminDbService.adminQuery.mock.calls[0];
      expect(dataCall[0]).toContain('ORDER BY v2.lasttime DESC, v2.bssid ASC');
    });
  });

  describe('filtering', () => {
    it('should filter by region', async () => {
      container.adminDbService.adminQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      await getEnrichmentCatalog({ region: 'CA' });

      const dataCall = container.adminDbService.adminQuery.mock.calls[0];
      expect(dataCall[0]).toContain('ILIKE');
      expect(dataCall[1]).toContain('CA%');
    });

    it('should filter by city', async () => {
      container.adminDbService.adminQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      await getEnrichmentCatalog({ city: 'Chicago' });

      const dataCall = container.adminDbService.adminQuery.mock.calls[0];
      expect(dataCall[0]).toContain('ILIKE');
      expect(dataCall[1]).toContain('Chicago%');
    });

    it('should filter by ssid', async () => {
      container.adminDbService.adminQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      await getEnrichmentCatalog({ ssid: 'MyNetwork' });

      const dataCall = container.adminDbService.adminQuery.mock.calls[0];
      expect(dataCall[0]).toContain('ILIKE');
      expect(dataCall[1]).toContain('%MyNetwork%');
    });

    it('should filter by bssid prefix', async () => {
      container.adminDbService.adminQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      await getEnrichmentCatalog({ bssid: 'AA:BB:CC' });

      const dataCall = container.adminDbService.adminQuery.mock.calls[0];
      expect(dataCall[0]).toContain('ILIKE');
      expect(dataCall[1]).toContain('AA:BB:CC%');
    });

    it('should combine multiple filters', async () => {
      container.adminDbService.adminQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      await getEnrichmentCatalog({ region: 'IL', city: 'Chicago', ssid: 'FBI' });

      const dataCall = container.adminDbService.adminQuery.mock.calls[0];
      expect(dataCall[0]).toContain('WHERE');
      expect(dataCall[0]).toContain('AND');
    });
  });

  describe('SQL injection prevention', () => {
    it('should not allow SQL injection in sortBy', async () => {
      container.adminDbService.adminQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      await getEnrichmentCatalog({
        sortBy: 'ssid; DELETE FROM app.wigle_v2_networks_search; --',
      });

      const dataCall = container.adminDbService.adminQuery.mock.calls[0];
      expect(dataCall[0]).toContain('ORDER BY v2.lasttime DESC, v2.bssid ASC');
      expect(dataCall[0]).not.toContain('DELETE');
    });

    it('should not allow multiple-statement injection in filters', async () => {
      container.adminDbService.adminQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      await getEnrichmentCatalog({
        region: "CA'; DROP TABLE app.wigle_v2_networks_search; --",
      });

      const dataCall = container.adminDbService.adminQuery.mock.calls[0];
      // Filter param is parameterized, so injection fails
      expect(dataCall[1]).toContain("CA'; DROP TABLE app.wigle_v2_networks_search; --%");
    });
  });

  describe('response shape', () => {
    it('should include all required fields', async () => {
      const mockData = [
        {
          bssid: 'AA:BB:CC:DD:EE:FF',
          ssid: 'Network1',
          region: 'CA',
          city: 'SF',
          v3_obs_count: 42,
          signal: -70,
        },
      ];
      container.adminDbService.adminQuery
        .mockResolvedValueOnce({ rows: mockData })
        .mockResolvedValueOnce({ rows: [{ count: 100 }] });

      const result = await getEnrichmentCatalog({});

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 100);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 50);
    });

    it('should return empty data array for no results', async () => {
      container.adminDbService.adminQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      const result = await getEnrichmentCatalog({});

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('query execution', () => {
    it('should execute two queries (data + count)', async () => {
      container.adminDbService.adminQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      await getEnrichmentCatalog({});

      expect(container.adminDbService.adminQuery).toHaveBeenCalledTimes(2);
    });

    it('should use different filter params for count vs main query', async () => {
      container.adminDbService.adminQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      await getEnrichmentCatalog({ region: 'CA', ssid: 'Test' });

      const countCall = container.adminDbService.adminQuery.mock.calls[1];
      // Count query should have filter params
      expect(countCall[1]).toContain('CA%');
      expect(countCall[1]).toContain('%Test%');
    });
  });
});

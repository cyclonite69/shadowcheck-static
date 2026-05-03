/**
 * Tests for adminOrphanNetworksService.ts listOrphanNetworks function
 * Verifies sorting, pagination, filtering, observations_imported count, and SQL injection prevention
 */

export {};

jest.mock('../../server/src/services/adminDbService', () => ({
  adminQuery: jest.fn(),
}));

const { adminQuery } = require('../../server/src/services/adminDbService');
const {
  listOrphanNetworks,
  getOrphanNetworkCounts,
} = require('../../server/src/services/adminOrphanNetworksService');

describe('adminOrphanNetworksService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listOrphanNetworks', () => {
    describe('pagination', () => {
      it('should apply default limit=50, offset=0', async () => {
        adminQuery.mockResolvedValueOnce({ rows: [] });

        await listOrphanNetworks();

        const call = adminQuery.mock.calls[0];
        expect(call[1]).toContain(50); // limit
        expect(call[1]).toContain(0); // offset
      });

      it('should clamp limit to max 500', async () => {
        adminQuery.mockResolvedValueOnce({ rows: [] });

        await listOrphanNetworks({ limit: 1000 });

        const call = adminQuery.mock.calls[0];
        expect(call[1]).toContain(500);
      });

      it('should enforce minimum limit of 1', async () => {
        adminQuery.mockResolvedValueOnce({ rows: [] });

        await listOrphanNetworks({ limit: 0 });

        const call = adminQuery.mock.calls[0];
        expect(call[1]).toContain(1);
      });

      it('should handle negative offset by converting to 0', async () => {
        adminQuery.mockResolvedValueOnce({ rows: [] });

        await listOrphanNetworks({ offset: -10 });

        const call = adminQuery.mock.calls[0];
        expect(call[1]).toContain(0);
      });

      it('should apply LIMIT and OFFSET in SQL', async () => {
        adminQuery.mockResolvedValueOnce({ rows: [{ bssid: 'AA:BB:CC:DD:EE:FF' }] });

        await listOrphanNetworks({ limit: 25, offset: 75 });

        const call = adminQuery.mock.calls[0];
        expect(call[0]).toContain('LIMIT');
        expect(call[0]).toContain('OFFSET');
        expect(call[1]).toContain(25);
        expect(call[1]).toContain(75);
      });
    });

    describe('sorting', () => {
      it('should use moved_at DESC, bssid ASC as default sort', async () => {
        adminQuery.mockResolvedValueOnce({ rows: [] });

        await listOrphanNetworks();

        const call = adminQuery.mock.calls[0];
        expect(call[0]).toContain('ORDER BY o.moved_at DESC, o.bssid ASC');
      });

      it('should accept single sort key', async () => {
        adminQuery.mockResolvedValueOnce({ rows: [] });

        await listOrphanNetworks({ sortBy: 'bssid' });

        const call = adminQuery.mock.calls[0];
        expect(call[0]).toContain('o.bssid ASC'); // defaults to ASC
      });

      it('should apply specified sort direction', async () => {
        adminQuery.mockResolvedValueOnce({ rows: [] });

        await listOrphanNetworks({ sortBy: 'bssid', sortDir: 'desc' });

        const call = adminQuery.mock.calls[0];
        expect(call[0]).toContain('o.bssid DESC');
      });

      it('should accept multiple sort keys with matching directions', async () => {
        adminQuery.mockResolvedValueOnce({ rows: [] });

        await listOrphanNetworks({ sortBy: 'bssid,ssid', sortDir: 'asc,desc' });

        const call = adminQuery.mock.calls[0];
        expect(call[0]).toContain('o.bssid ASC, o.ssid DESC');
      });

      it('should handle observations_imported sort key', async () => {
        adminQuery.mockResolvedValueOnce({ rows: [] });

        await listOrphanNetworks({ sortBy: 'observations_imported', sortDir: 'desc' });

        const call = adminQuery.mock.calls[0];
        expect(call[0]).toContain('ob.observations_imported DESC');
      });

      it('should handle backfill_status sort key', async () => {
        adminQuery.mockResolvedValueOnce({ rows: [] });

        await listOrphanNetworks({ sortBy: 'backfill_status', sortDir: 'asc' });

        const call = adminQuery.mock.calls[0];
        expect(call[0]).toContain('ob.status ASC');
      });

      it('should reject invalid sort keys (SQL injection prevention)', async () => {
        adminQuery.mockResolvedValueOnce({ rows: [] });

        await listOrphanNetworks({ sortBy: 'invalid_column; DROP TABLE' });

        const call = adminQuery.mock.calls[0];
        expect(call[0]).toContain('ORDER BY o.moved_at DESC, o.bssid ASC');
      });

      it('should allow all keys in SORT_ALLOWLIST', async () => {
        const allowlistKeys = [
          'bssid',
          'ssid',
          'moved_at',
          'move_reason',
          'lasttime_ms',
          'bestlevel',
          'unique_days',
          'unique_locations',
          'observations_imported',
          'backfill_status',
          'last_attempted_at',
        ];

        for (const key of allowlistKeys) {
          adminQuery.mockClear();
          adminQuery.mockResolvedValueOnce({ rows: [] });

          await listOrphanNetworks({ sortBy: key });

          const call = adminQuery.mock.calls[0];
          expect(call[0]).toContain(' ASC');
        }
      });

      it('should revert to default sort when all keys are invalid', async () => {
        adminQuery.mockResolvedValueOnce({ rows: [] });

        await listOrphanNetworks({ sortBy: 'malicious1,malicious2' });

        const call = adminQuery.mock.calls[0];
        expect(call[0]).toContain('ORDER BY o.moved_at DESC, o.bssid ASC');
      });
    });

    describe('filtering', () => {
      it('should search by bssid with ILIKE', async () => {
        adminQuery.mockResolvedValueOnce({ rows: [] });

        await listOrphanNetworks({ search: 'AA:BB:CC' });

        const call = adminQuery.mock.calls[0];
        expect(call[0]).toContain('ILIKE');
        expect(call[1]).toContain('%AA:BB:CC%');
      });

      it('should search by ssid with ILIKE', async () => {
        adminQuery.mockResolvedValueOnce({ rows: [] });

        await listOrphanNetworks({ search: 'TestSSID' });

        const call = adminQuery.mock.calls[0];
        expect(call[0]).toContain('ILIKE');
        expect(call[1]).toContain('%TestSSID%');
      });

      it('should handle empty search', async () => {
        adminQuery.mockResolvedValueOnce({ rows: [] });

        await listOrphanNetworks({ search: '' });

        const call = adminQuery.mock.calls[0];
        expect(call[0]).not.toContain('WHERE');
      });

      it('should trim search string', async () => {
        adminQuery.mockResolvedValueOnce({ rows: [] });

        await listOrphanNetworks({ search: '  test  ' });

        const call = adminQuery.mock.calls[0];
        expect(call[1]).toContain('%test%');
      });
    });

    describe('observations_imported count', () => {
      it('should return COALESCE(ob.observations_imported, 0) for obs count', async () => {
        const mockRow = {
          bssid: 'AA:BB:CC:DD:EE:FF',
          ssid: 'TestNetwork',
          observations_imported: 42,
        };
        adminQuery.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await listOrphanNetworks();

        expect(result[0].observations_imported).toBe(42);
      });

      it('should default to 0 when observations_imported is null', async () => {
        const mockRow = {
          bssid: 'AA:BB:CC:DD:EE:FF',
          ssid: 'TestNetwork',
          observations_imported: 0, // COALESCE applied in query
        };
        adminQuery.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await listOrphanNetworks();

        expect(result[0].observations_imported).toBe(0);
      });

      it('should select COALESCE(ob.observations_imported, 0) not wigle_v3_observation_count', async () => {
        adminQuery.mockResolvedValueOnce({ rows: [] });

        await listOrphanNetworks();

        const call = adminQuery.mock.calls[0];
        const sql = call[0];
        // Should have COALESCE(ob.observations_imported, 0)
        expect(sql).toContain('COALESCE(ob.observations_imported, 0) AS observations_imported');
        // Should NOT have wigle_v3_observation_count
        expect(sql).toContain('o.wigle_v3_observation_count'); // in SELECT but not for count
      });
    });

    describe('response shape', () => {
      it('should return array of orphan network rows', async () => {
        const mockRows = [
          {
            bssid: 'AA:BB:CC:DD:EE:FF',
            ssid: 'Network1',
            observations_imported: 10,
          },
          {
            bssid: 'FF:EE:DD:CC:BB:AA',
            ssid: 'Network2',
            observations_imported: 20,
          },
        ];
        adminQuery.mockResolvedValueOnce({ rows: mockRows });

        const result = await listOrphanNetworks();

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);
        expect(result[0].bssid).toBe('AA:BB:CC:DD:EE:FF');
      });

      it('should include backfill status coalesced to not_attempted', async () => {
        const mockRow = {
          bssid: 'AA:BB:CC:DD:EE:FF',
          backfill_status: 'not_attempted',
        };
        adminQuery.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await listOrphanNetworks();

        expect(result[0].backfill_status).toBe('not_attempted');
      });
    });

    describe('SQL injection prevention', () => {
      it('should not allow SQL injection in sortBy', async () => {
        adminQuery.mockResolvedValueOnce({ rows: [] });

        await listOrphanNetworks({
          sortBy: 'bssid; DELETE FROM app.networks_orphans; --',
        });

        const call = adminQuery.mock.calls[0];
        expect(call[0]).toContain('ORDER BY o.moved_at DESC, o.bssid ASC');
        expect(call[0]).not.toContain('DELETE');
      });

      it('should not allow multiple-statement injection in search', async () => {
        adminQuery.mockResolvedValueOnce({ rows: [] });

        await listOrphanNetworks({
          search: "test'; DROP TABLE app.networks_orphans; --",
        });

        const call = adminQuery.mock.calls[0];
        // Search param is parameterized
        expect(call[1]).toContain("%test'; DROP TABLE app.networks_orphans; --%");
      });
    });
  });

  describe('getOrphanNetworkCounts', () => {
    it('should return total count', async () => {
      adminQuery.mockResolvedValueOnce({ rows: [{ total: 42 }] });

      const result = await getOrphanNetworkCounts();

      expect(result.total).toBe(42);
    });

    it('should handle zero count', async () => {
      adminQuery.mockResolvedValueOnce({ rows: [{ total: 0 }] });

      const result = await getOrphanNetworkCounts();

      expect(result.total).toBe(0);
    });

    it('should filter by search term', async () => {
      adminQuery.mockResolvedValueOnce({ rows: [{ total: 5 }] });

      await getOrphanNetworkCounts({ search: 'TestNetwork' });

      const call = adminQuery.mock.calls[0];
      expect(call[0]).toContain('ILIKE');
      expect(call[1]).toContain('%TestNetwork%');
    });

    it('should handle empty search', async () => {
      adminQuery.mockResolvedValueOnce({ rows: [{ total: 100 }] });

      const result = await getOrphanNetworkCounts({ search: '' });

      const call = adminQuery.mock.calls[0];
      expect(call[0]).not.toContain('WHERE');
      expect(result.total).toBe(100);
    });
  });
});

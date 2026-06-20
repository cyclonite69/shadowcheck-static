export {};

jest.mock('../../server/src/services/adminDbService', () => ({
  adminQuery: jest.fn(),
}));

const adminDbService = require('../../server/src/services/adminDbService');
const svc = require('../../server/src/services/adminSiblingService');

describe('adminSiblingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setNetworkSiblingOverride', () => {
    test('calls adminQuery with correct params', async () => {
      adminDbService.adminQuery.mockResolvedValue({ rows: [] });
      await svc.setNetworkSiblingOverride(
        'AA:BB:CC:DD:EE:FF',
        '11:22:33:44:55:66',
        'sibling',
        'user1',
        'note',
        0.9
      );
      expect(adminDbService.adminQuery).toHaveBeenCalled();
      const [sql, params] = adminDbService.adminQuery.mock.calls[0];
      expect(sql).toContain('SELECT app.set_network_sibling_override($1, $2, $3, $4, $5, $6)');
      expect(params).toEqual([
        'AA:BB:CC:DD:EE:FF',
        '11:22:33:44:55:66',
        'sibling',
        'user1',
        'note',
        0.9,
      ]);
    });

    test('defaults notes to null and confidence to 1.0', async () => {
      adminDbService.adminQuery.mockResolvedValue({ rows: [] });
      await svc.setNetworkSiblingOverride(
        'AA:BB:CC:DD:EE:FF',
        '11:22:33:44:55:66',
        'not_sibling',
        'user1'
      );
      expect(adminDbService.adminQuery).toHaveBeenCalled();
      const [sql, params] = adminDbService.adminQuery.mock.calls[0];
      expect(sql).toContain('SELECT app.set_network_sibling_override($1, $2, $3, $4, $5, $6)');
      expect(params).toEqual([
        'AA:BB:CC:DD:EE:FF',
        '11:22:33:44:55:66',
        'not_sibling',
        'user1',
        null,
        1.0,
      ]);
    });
  });

  describe('getNetworkSiblingLinks', () => {
    test('returns rows from adminQuery', async () => {
      const mockRows = [
        {
          sibling_bssid: '11:22:33:44:55:66',
          source: 'manual',
          rule: null,
          pair_strength: null,
          confidence: 1.0,
        },
      ];
      adminDbService.adminQuery.mockResolvedValue({ rows: mockRows });
      const result = await svc.getNetworkSiblingLinks('AA:BB:CC:DD:EE:FF');
      expect(result).toEqual(mockRows);
      expect(adminDbService.adminQuery).toHaveBeenCalled();
      const [sql, params] = adminDbService.adminQuery.mock.calls[0];
      expect(sql).toContain('SELECT');
      expect(sql).toContain('CASE');
      expect(sql).toContain('WHEN bssid1 = $1 THEN bssid2');
      expect(sql).toContain('ELSE bssid1');
      expect(sql).toContain('END AS sibling_bssid');
      expect(sql).toContain('source');
      expect(sql).toContain('rule');
      expect(sql).toContain('pair_strength');
      expect(sql).toContain('confidence');
      expect(sql).toContain('FROM app.network_siblings_effective');
      expect(sql).toContain('WHERE bssid1 = $1 OR bssid2 = $1');
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('confidence DESC NULLS LAST');
      expect(sql).toContain('sibling_bssid ASC');
      expect(params).toEqual(['AA:BB:CC:DD:EE:FF']);
    });
  });

  describe('getNetworkSiblingLinksBatch — normalization', () => {
    test('returns empty array for empty input', async () => {
      const result = await svc.getNetworkSiblingLinksBatch([]);
      expect(result).toEqual([]);
      expect(adminDbService.adminQuery).not.toHaveBeenCalled();
    });

    test('returns empty array for non-array input', async () => {
      const result = await svc.getNetworkSiblingLinksBatch(null);
      expect(result).toEqual([]);
      expect(adminDbService.adminQuery).not.toHaveBeenCalled();
    });

    test('filters out empty/falsy entries', async () => {
      adminDbService.adminQuery.mockResolvedValue({ rows: [] });
      await svc.getNetworkSiblingLinksBatch(['AA:BB:CC:DD:EE:FF', '', null, undefined]);
      const [, params] = adminDbService.adminQuery.mock.calls[0];
      expect(params[0]).toEqual(['AA:BB:CC:DD:EE:FF']);
    });

    test('uppercases all BSSIDs', async () => {
      adminDbService.adminQuery.mockResolvedValue({ rows: [] });
      await svc.getNetworkSiblingLinksBatch(['aa:bb:cc:dd:ee:ff', 'AA:BB:CC:DD:EE:FF']);
      const [, params] = adminDbService.adminQuery.mock.calls[0];
      // deduped after uppercase → only one entry
      expect(params[0]).toEqual(['AA:BB:CC:DD:EE:FF']);
    });

    test('deduplicates BSSIDs', async () => {
      adminDbService.adminQuery.mockResolvedValue({ rows: [] });
      await svc.getNetworkSiblingLinksBatch([
        'AA:BB:CC:DD:EE:FF',
        'AA:BB:CC:DD:EE:FF',
        '11:22:33:44:55:66',
      ]);
      const [, params] = adminDbService.adminQuery.mock.calls[0];
      expect(params[0]).toHaveLength(2);
      expect(params[0]).toContain('AA:BB:CC:DD:EE:FF');
      expect(params[0]).toContain('11:22:33:44:55:66');
    });

    test('trims whitespace from BSSIDs', async () => {
      adminDbService.adminQuery.mockResolvedValue({ rows: [] });
      await svc.getNetworkSiblingLinksBatch(['  AA:BB:CC:DD:EE:FF  ']);
      const [, params] = adminDbService.adminQuery.mock.calls[0];
      expect(params[0]).toEqual(['AA:BB:CC:DD:EE:FF']);
    });

    test('returns rows from adminQuery', async () => {
      const mockRows = [
        {
          bssid_a: 'AA:BB:CC:DD:EE:FF',
          bssid_b: '11:22:33:44:55:66',
          source: 'rule',
          rule: 'co_located',
          pair_strength: 'strong',
          confidence: 0.95,
        },
      ];
      adminDbService.adminQuery.mockResolvedValue({ rows: mockRows });
      const result = await svc.getNetworkSiblingLinksBatch(['AA:BB:CC:DD:EE:FF']);
      expect(result).toEqual(mockRows);

      expect(adminDbService.adminQuery).toHaveBeenCalled();
      const [sql, params] = adminDbService.adminQuery.mock.calls[0];
      expect(sql).toContain('SELECT');
      expect(sql).toContain('bssid1 AS bssid_a');
      expect(sql).toContain('bssid2 AS bssid_b');
      expect(sql).toContain('source');
      expect(sql).toContain('rule');
      expect(sql).toContain('pair_strength');
      expect(sql).toContain('confidence');
      expect(sql).toContain('FROM app.network_siblings_effective');
      expect(sql).toContain('WHERE bssid1 = ANY($1::text[])');
      expect(sql).toContain('OR bssid2 = ANY($1::text[])');
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('confidence DESC NULLS LAST');
      expect(sql).toContain('bssid1 ASC');
      expect(sql).toContain('bssid2 ASC');
      expect(params).toEqual([['AA:BB:CC:DD:EE:FF']]);
    });
  });

  // ── P5: Endpoint symmetry ──────────────────────────────────────────────────

  describe('endpoint symmetry – SQL uses OR to cover both pair orientations', () => {
    test('getNetworkSiblingLinks SQL uses bssid1=$1 OR bssid2=$1 (symmetric lookup)', async () => {
      adminDbService.adminQuery.mockResolvedValue({ rows: [] });
      await svc.getNetworkSiblingLinks('AA:BB:CC:DD:EE:FF');
      const [sql] = adminDbService.adminQuery.mock.calls[0];
      expect(sql).toMatch(/bssid1\s*=\s*\$1\s+OR\s+bssid2\s*=\s*\$1/i);
    });

    test('getNetworkSiblingLinks resolves sibling_bssid for both pair orientations', async () => {
      // When queried as bssid1
      adminDbService.adminQuery.mockResolvedValueOnce({
        rows: [
          {
            sibling_bssid: '11:22:33:44:55:66',
            source: 'heuristic',
            rule: 'Class A',
            pair_strength: 'candidate',
            confidence: 0.9,
          },
        ],
      });
      const fromA = await svc.getNetworkSiblingLinks('AA:BB:CC:DD:EE:FF');
      expect(fromA[0].sibling_bssid).toBe('11:22:33:44:55:66');

      // When queried as bssid2
      adminDbService.adminQuery.mockResolvedValueOnce({
        rows: [
          {
            sibling_bssid: 'AA:BB:CC:DD:EE:FF',
            source: 'heuristic',
            rule: 'Class A',
            pair_strength: 'candidate',
            confidence: 0.9,
          },
        ],
      });
      const fromB = await svc.getNetworkSiblingLinks('11:22:33:44:55:66');
      expect(fromB[0].sibling_bssid).toBe('AA:BB:CC:DD:EE:FF');
    });

    test('getNetworkSiblingLinksBatch SQL uses OR ANY for both bssid columns (symmetric)', async () => {
      adminDbService.adminQuery.mockResolvedValue({ rows: [] });
      await svc.getNetworkSiblingLinksBatch(['AA:BB:CC:DD:EE:FF']);
      const [sql] = adminDbService.adminQuery.mock.calls[0];
      expect(sql).toMatch(/bssid1\s*=\s*ANY/i);
      expect(sql).toMatch(/bssid2\s*=\s*ANY/i);
      expect(sql).toMatch(/OR/i);
    });

    test('getNetworkSiblingLinksBatch returns pair when requested BSSID is bssid2', async () => {
      const mockRows = [
        {
          bssid_a: 'AA:BB:CC:DD:EE:FF',
          bssid_b: '11:22:33:44:55:66',
          source: 'heuristic',
          rule: 'Mist Systems VAP (Class A)',
          pair_strength: 'strong',
          confidence: 0.98,
        },
      ];
      adminDbService.adminQuery.mockResolvedValue({ rows: mockRows });
      // Query for the bssid2 endpoint — should still return the pair
      const result = await svc.getNetworkSiblingLinksBatch(['11:22:33:44:55:66']);
      expect(result).toEqual(mockRows);
    });
  });

  describe('getSiblingComponentBssids', () => {
    test('returns empty array for empty inputs without calling database', async () => {
      const res1 = await svc.getSiblingComponentBssids('');
      expect(res1).toEqual([]);
      expect(adminDbService.adminQuery).not.toHaveBeenCalled();

      const res2 = await svc.getSiblingComponentBssids(null);
      expect(res2).toEqual([]);
      expect(adminDbService.adminQuery).not.toHaveBeenCalled();
    });

    test('normalizes input BSSID and asserts query structure and params', async () => {
      adminDbService.adminQuery.mockResolvedValue({
        rows: [{ bssid: '  11:22:33:44:55:66  ' }, { bssid: 'AA:BB:CC:DD:EE:FF' }],
      });

      const res = await svc.getSiblingComponentBssids('  aa:bb:cc:dd:ee:ff  ');

      // Assert mapped array output behavior
      expect(res).toEqual(['11:22:33:44:55:66', 'AA:BB:CC:DD:EE:FF']);

      // Assert parameter passing behavior
      const [sql, params] = adminDbService.adminQuery.mock.calls[0];
      expect(params).toEqual(['AA:BB:CC:DD:EE:FF']);

      // Assert query structure
      expect(sql).toContain('WITH RECURSIVE');
      expect(sql).toContain('seed AS (SELECT $1::text AS bssid)');
      expect(sql).toContain('edges AS (');
      expect(sql).toContain('SELECT upper(bssid1) AS a, upper(bssid2) AS b');
      expect(sql).toContain('FROM app.network_siblings_effective');
      expect(sql).toContain('comp AS (');
      expect(sql).toContain('SELECT (SELECT bssid FROM seed) AS bssid');
      expect(sql).toContain('UNION');
      expect(sql).toContain('SELECT CASE WHEN e.a = c.bssid THEN e.b ELSE e.a END');
      expect(sql).toContain('FROM comp c');
      expect(sql).toContain('JOIN edges e ON e.a = c.bssid OR e.b = c.bssid');
      expect(sql).toContain('SELECT bssid FROM comp ORDER BY bssid');
    });
  });
});

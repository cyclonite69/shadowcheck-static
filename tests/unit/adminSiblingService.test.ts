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
      expect(adminDbService.adminQuery).toHaveBeenCalledWith(
        expect.stringContaining('set_network_sibling_override'),
        ['AA:BB:CC:DD:EE:FF', '11:22:33:44:55:66', 'sibling', 'user1', 'note', 0.9]
      );
    });

    test('defaults notes to null and confidence to 1.0', async () => {
      adminDbService.adminQuery.mockResolvedValue({ rows: [] });
      await svc.setNetworkSiblingOverride(
        'AA:BB:CC:DD:EE:FF',
        '11:22:33:44:55:66',
        'not_sibling',
        'user1'
      );
      expect(adminDbService.adminQuery).toHaveBeenCalledWith(expect.any(String), [
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
      expect(adminDbService.adminQuery).toHaveBeenCalledWith(expect.any(String), [
        'AA:BB:CC:DD:EE:FF',
      ]);
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
});

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
});

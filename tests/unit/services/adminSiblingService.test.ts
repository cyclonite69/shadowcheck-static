export {};

const mockAdminQuery = jest.fn();

jest.mock('../../../server/src/services/adminDbService', () => ({
  adminQuery: mockAdminQuery,
}));

const {
  setNetworkSiblingOverride,
  getNetworkSiblingLinks,
  getNetworkSiblingLinksBatch,
  getSiblingComponentBssids,
} = require('../../../server/src/services/adminSiblingService');

beforeEach(() => jest.clearAllMocks());

// ── getSiblingComponentBssids ─────────────────────────────────────────────────

describe('getSiblingComponentBssids', () => {
  test('returns empty array for empty input', async () => {
    const result = await getSiblingComponentBssids('');
    expect(mockAdminQuery).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  test('normalizes input BSSID', async () => {
    mockAdminQuery.mockResolvedValue({ rows: [{ bssid: 'AA:BB:CC:DD:EE:FF' }] });
    await getSiblingComponentBssids('  aa:bb:cc:dd:ee:ff  ');
    expect(mockAdminQuery).toHaveBeenCalledWith(expect.stringContaining('WITH RECURSIVE'), [
      'AA:BB:CC:DD:EE:FF',
    ]);
  });

  test('returns unique normalized BSSIDs from result rows', async () => {
    mockAdminQuery.mockResolvedValue({
      rows: [{ bssid: 'aa:bb:cc:11:22:33' }, { bssid: 'AA:BB:CC:44:55:66 ' }],
    });
    const result = await getSiblingComponentBssids('SEED');
    expect(result).toEqual(['AA:BB:CC:11:22:33', 'AA:BB:CC:44:55:66']);
  });
});

// ── setNetworkSiblingOverride ─────────────────────────────────────────────────

describe('setNetworkSiblingOverride', () => {
  test('calls the correct stored procedure with all parameters', async () => {
    mockAdminQuery.mockResolvedValue({ rows: [] });
    await setNetworkSiblingOverride(
      'AA:BB:CC:DD:EE:FF',
      '11:22:33:44:55:66',
      'sibling',
      'admin',
      'test note',
      0.9
    );
    expect(mockAdminQuery).toHaveBeenCalledWith(
      expect.stringContaining('app.set_network_sibling_override'),
      ['AA:BB:CC:DD:EE:FF', '11:22:33:44:55:66', 'sibling', 'admin', 'test note', 0.9]
    );
  });

  test('defaults notes to null and confidence to 1.0', async () => {
    mockAdminQuery.mockResolvedValue({ rows: [] });
    await setNetworkSiblingOverride(
      'AA:BB:CC:DD:EE:FF',
      '11:22:33:44:55:66',
      'not_sibling',
      'admin'
    );
    expect(mockAdminQuery).toHaveBeenCalledWith(expect.any(String), [
      'AA:BB:CC:DD:EE:FF',
      '11:22:33:44:55:66',
      'not_sibling',
      'admin',
      null,
      1.0,
    ]);
  });
});

// ── getNetworkSiblingLinks ────────────────────────────────────────────────────

describe('getNetworkSiblingLinks', () => {
  test('returns rows from query result', async () => {
    const mockRows = [
      {
        sibling_bssid: '11:22:33:44:55:66',
        source: 'ml',
        rule: 'co_location',
        pair_strength: 'strong',
        confidence: 0.95,
      },
    ];
    mockAdminQuery.mockResolvedValue({ rows: mockRows });

    const result = await getNetworkSiblingLinks('AA:BB:CC:DD:EE:FF');
    expect(result).toEqual(mockRows);
  });

  test('queries network_siblings_effective with bssid as both bssid1 and bssid2', async () => {
    mockAdminQuery.mockResolvedValue({ rows: [] });
    await getNetworkSiblingLinks('AA:BB:CC:DD:EE:FF');
    expect(mockAdminQuery).toHaveBeenCalledWith(
      expect.stringContaining('network_siblings_effective'),
      ['AA:BB:CC:DD:EE:FF']
    );
    const sql: string = mockAdminQuery.mock.calls[0][0];
    expect(sql).toContain('bssid1 = $1');
    expect(sql).toContain('bssid2 = $1');
  });

  test('returns empty array when no siblings found', async () => {
    mockAdminQuery.mockResolvedValue({ rows: [] });
    const result = await getNetworkSiblingLinks('AA:BB:CC:DD:EE:FF');
    expect(result).toEqual([]);
  });
});

// ── getNetworkSiblingLinksBatch ───────────────────────────────────────────────

describe('getNetworkSiblingLinksBatch', () => {
  test('returns empty array without querying for empty input', async () => {
    const result = await getNetworkSiblingLinksBatch([]);
    expect(mockAdminQuery).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  test('returns empty array without querying for null input', async () => {
    const result = await getNetworkSiblingLinksBatch(null);
    expect(mockAdminQuery).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  test('normalizes lowercase BSSIDs to uppercase', async () => {
    mockAdminQuery.mockResolvedValue({ rows: [] });
    await getNetworkSiblingLinksBatch(['aa:bb:cc:dd:ee:ff']);
    const params: string[][] = mockAdminQuery.mock.calls[0][1];
    expect(params[0]).toContain('AA:BB:CC:DD:EE:FF');
  });

  test('normalizes mixed-case BSSIDs to uppercase', async () => {
    mockAdminQuery.mockResolvedValue({ rows: [] });
    await getNetworkSiblingLinksBatch(['Aa:Bb:Cc:Dd:Ee:Ff']);
    const params: string[][] = mockAdminQuery.mock.calls[0][1];
    expect(params[0]).toContain('AA:BB:CC:DD:EE:FF');
  });

  test('deduplicates BSSIDs differing only by case', async () => {
    mockAdminQuery.mockResolvedValue({ rows: [] });
    await getNetworkSiblingLinksBatch([
      'aa:bb:cc:dd:ee:ff',
      'AA:BB:CC:DD:EE:FF',
      'AA:BB:CC:DD:EE:FF',
    ]);
    const params: string[][] = mockAdminQuery.mock.calls[0][1];
    expect(params[0]).toHaveLength(1);
    expect(params[0][0]).toBe('AA:BB:CC:DD:EE:FF');
  });

  test('trims whitespace from BSSIDs before normalization', async () => {
    mockAdminQuery.mockResolvedValue({ rows: [] });
    await getNetworkSiblingLinksBatch(['  AA:BB:CC:DD:EE:FF  ']);
    const params: string[][] = mockAdminQuery.mock.calls[0][1];
    expect(params[0][0]).toBe('AA:BB:CC:DD:EE:FF');
  });

  test('filters out empty/falsy entries', async () => {
    mockAdminQuery.mockResolvedValue({ rows: [] });
    await getNetworkSiblingLinksBatch(['AA:BB:CC:DD:EE:FF', '', null as any, undefined as any]);
    const params: string[][] = mockAdminQuery.mock.calls[0][1];
    expect(params[0]).toEqual(['AA:BB:CC:DD:EE:FF']);
  });

  test('returns empty array without querying when all entries are empty after normalization', async () => {
    const result = await getNetworkSiblingLinksBatch(['', '   ', null as any]);
    expect(mockAdminQuery).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  test('returns rows from query result', async () => {
    const mockRows = [
      {
        bssid_a: 'AA:BB:CC:DD:EE:FF',
        bssid_b: '11:22:33:44:55:66',
        source: 'ml',
        rule: null,
        pair_strength: null,
        confidence: 0.8,
      },
    ];
    mockAdminQuery.mockResolvedValue({ rows: mockRows });
    const result = await getNetworkSiblingLinksBatch(['AA:BB:CC:DD:EE:FF']);
    expect(result).toEqual(mockRows);
  });

  test('queries network_siblings_effective with normalized array', async () => {
    mockAdminQuery.mockResolvedValue({ rows: [] });
    await getNetworkSiblingLinksBatch(['aa:bb:cc:dd:ee:ff', '11:22:33:44:55:66']);
    const sql: string = mockAdminQuery.mock.calls[0][0];
    expect(sql).toContain('network_siblings_effective');
    expect(sql).toContain('bssid1 = ANY');
    expect(sql).toContain('bssid2 = ANY');
  });
});

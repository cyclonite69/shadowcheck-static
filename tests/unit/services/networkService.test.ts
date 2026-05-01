const { getFilteredNetworks } = require('../../../server/src/services/networkService');
const queryPartsModule = require('../../../server/src/services/networking/queryParts');
const homeLocationModule = require('../../../server/src/services/networking/homeLocation');
const sortingModule = require('../../../server/src/services/networking/sorting');
const repo = require('../../../server/src/services/networking/repository');

// Mock dependencies
jest.mock('../../../server/src/services/featureFlagService', () => ({
  getFlag: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../server/src/logging/logger', () => ({
  warn: jest.fn(),
}));

jest.mock('../../../server/src/services/networking/homeLocation', () => ({
  getHomeLocation: jest.fn(),
}));

jest.mock('../../../server/src/services/networking/queryParts', () => ({
  buildNetworkQueryParts: jest.fn(),
}));

jest.mock('../../../server/src/services/networking/repository', () => ({
  getNetworkCount: jest.fn(),
  listNetworks: jest.fn(),
  explainQuery: jest.fn(),
  getManufacturerByBSSID: jest.fn(),
  searchNetworksBySSID: jest.fn(),
}));

jest.mock('../../../server/src/services/networking/sorting', () => ({
  parseNetworkSort: jest.fn(),
}));

jest.mock('../../../server/src/services/networking/sql', () => ({
  buildNetworkDataQuery: jest.fn().mockReturnValue('SELECT * FROM...'),
}));

describe('networkService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    homeLocationModule.getHomeLocation.mockResolvedValue({ lat: 0, lon: 0 });

    queryPartsModule.buildNetworkQueryParts.mockReturnValue({
      queryParts: {
        columnsWithDistance: '*',
        joins: '',
        conditions: '',
        params: [],
        paramIndex: 1,
        appliedFilters: [],
      },
      channelExpr: 'channel',
      threatLevelExpr: 'threat_level',
    });

    sortingModule.parseNetworkSort.mockReturnValue({
      sortEntries: [],
      sortClauses: [],
      ignoredSorts: [],
      expensiveSort: false,
    });

    repo.listNetworks.mockResolvedValue([{ bssid: 'AA' }]);
    repo.getNetworkCount.mockResolvedValue(100);
    repo.explainQuery.mockResolvedValue([{ 'QUERY PLAN': 'Seq Scan' }]);
  });

  describe('getFilteredNetworks', () => {
    it('should return networks and total count', async () => {
      const opts = { limit: 10, offset: 0 };
      const result = await getFilteredNetworks(opts);

      expect(result.total).toBe(100);
      expect(result.networks).toHaveLength(1);
    });

    it('returns 400 when expensiveSort is true and limit > 2000', async () => {
      sortingModule.parseNetworkSort.mockReturnValue({
        sortEntries: [],
        sortClauses: [],
        ignoredSorts: [],
        expensiveSort: true,
      });

      const result = await getFilteredNetworks({ limit: 2001, offset: 0 });

      expect(result.status).toBe(400);
      expect(result.error).toMatch(/expensive/i);
      expect(repo.listNetworks).not.toHaveBeenCalled();
    });

    it('allows expensiveSort when limit <= 2000', async () => {
      sortingModule.parseNetworkSort.mockReturnValue({
        sortEntries: [],
        sortClauses: [],
        ignoredSorts: [],
        expensiveSort: true,
      });

      const result = await getFilteredNetworks({ limit: 2000, offset: 0 });

      expect(result.networks).toBeDefined();
      expect(result.status).toBeUndefined();
    });

    it('calls explainQuery and returns plan shape when planCheck is true', async () => {
      // Verify explainQuery is called when planCheck=true
      const result = await getFilteredNetworks({ limit: 10, offset: 0, planCheck: true } as any);

      // explainQuery should have been called (planCheck branch entered)
      expect(repo.explainQuery).toHaveBeenCalled();
      // result should have plan-mode keys, not network-list keys
      expect(result).toHaveProperty('plan');
      expect(result).toHaveProperty('query');
      expect(result).toHaveProperty('total');
      expect(result).not.toHaveProperty('networks');
    });

    it('warns and continues when home location fetch fails', async () => {
      const logger = require('../../../server/src/logging/logger');
      homeLocationModule.getHomeLocation.mockRejectedValue(new Error('no home set'));

      const result = await getFilteredNetworks({ limit: 10, offset: 0 });

      expect(logger.warn).toHaveBeenCalledWith('Could not fetch home location', expect.any(Object));
      expect(result.networks).toBeDefined();
    });

    it('includes appliedFilters and ignoredSorts in response', async () => {
      sortingModule.parseNetworkSort.mockReturnValue({
        sortEntries: [{ field: 'last_seen', direction: 'DESC' }],
        sortClauses: ['last_seen DESC'],
        ignoredSorts: ['unknown_col'],
        expensiveSort: false,
      });

      const result = await getFilteredNetworks({ limit: 10, offset: 0 });

      expect(result.ignoredSorts).toEqual(['unknown_col']);
      expect(result.appliedFilters).toContainEqual({ field: 'last_seen', direction: 'DESC' });
    });
  });
});

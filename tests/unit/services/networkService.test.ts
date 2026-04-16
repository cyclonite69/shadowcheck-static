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
  });

  describe('getFilteredNetworks', () => {
    it('should return networks and total count', async () => {
      const opts = { limit: 10, offset: 0 };
      const result = await getFilteredNetworks(opts);

      expect(result.total).toBe(100);
      expect(result.networks).toHaveLength(1);
    });
  });
});

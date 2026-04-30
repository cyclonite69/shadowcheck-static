export {};

jest.mock('../../../server/src/services/adminDbService', () => ({
  adminQuery: jest.fn(),
}));

jest.mock('../../../server/src/services/wigleService', () => ({
  importWigleV3Observation: jest.fn(),
  importWigleV3NetworkDetail: jest.fn(),
  getWigleObservations: jest.fn(),
}));

jest.mock('../../../server/src/services/wigleDetailService', () => ({
  fetchUpstream: jest.fn(),
  importObservations: jest.fn(),
}));

jest.mock('../../../server/src/services/secretsManager', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  },
}));

jest.mock('../../../server/src/logging/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const { adminQuery } = require('../../../server/src/services/adminDbService');
const wigleService = require('../../../server/src/services/wigleService');
const secretsManager = require('../../../server/src/services/secretsManager').default;
const {
  fetchUpstream,
  importObservations,
} = require('../../../server/src/services/wigleDetailService');
const {
  listOrphanNetworks,
  getOrphanNetworkCounts,
  backfillOrphanNetworkFromWigle,
} = require('../../../server/src/services/adminOrphanNetworksService');

describe('adminOrphanNetworksService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure adminQuery always returns a Promise so wigleRequestLedger.recordRequest
    // can call .catch on it (resetMocks: true strips the implementation between tests)
    adminQuery.mockResolvedValue({ rows: [] });
    global.fetch = jest.fn();
    fetchUpstream.mockResolvedValue({ ok: true, data: null, status: 200 });
    importObservations.mockResolvedValue({ newCount: 0, totalCount: 0, failedCount: 0 });
    require('../../../server/src/services/wigleRequestLedger').resetQuotaLedger();
  });

  describe('listOrphanNetworks', () => {
    it('should list orphan networks with defaults', async () => {
      adminQuery.mockResolvedValueOnce({ rows: [{ bssid: 'test' }] });
      const result = await listOrphanNetworks();
      expect(result.length).toBe(1);
      expect(adminQuery).toHaveBeenCalled();
    });

    it('should list orphan networks with search', async () => {
      adminQuery.mockResolvedValueOnce({ rows: [{ bssid: 'test' }] });
      const result = await listOrphanNetworks({ search: 'query' });
      expect(result.length).toBe(1);
    });
  });

  describe('getOrphanNetworkCounts', () => {
    it('should get count', async () => {
      adminQuery.mockResolvedValueOnce({ rows: [{ total: 5 }] });
      const result = await getOrphanNetworkCounts();
      expect(result.total).toBe(5);
    });

    it('should get count with search', async () => {
      adminQuery.mockResolvedValueOnce({ rows: [{ total: 2 }] });
      const result = await getOrphanNetworkCounts({ search: 'query' });
      expect(result.total).toBe(2);
    });
  });

  describe('backfillOrphanNetworkFromWigle', () => {
    it('should throw if orphan not found', async () => {
      adminQuery.mockResolvedValueOnce({ rows: [] });
      await expect(backfillOrphanNetworkFromWigle('00:11:22')).rejects.toThrow(
        'Orphan network not found'
      );
    });

    it('should return error status when upstream payload is invalid', async () => {
      adminQuery.mockResolvedValueOnce({ rows: [{ bssid: '00:11:22', type: 'WIFI' }] });
      fetchUpstream.mockResolvedValueOnce({
        ok: false,
        status: 500,
        data: { message: 'upstream failed' },
      });
      const res = await backfillOrphanNetworkFromWigle('00:11:22');
      expect(res.status).toBe('error');
    });

    it('should handle API 404', async () => {
      adminQuery.mockResolvedValueOnce({ rows: [{ bssid: '00:11:22', type: 'WIFI' }] });
      fetchUpstream.mockResolvedValueOnce({
        ok: false,
        status: 404,
        data: { message: 'not found' },
      });
      adminQuery.mockResolvedValueOnce({ rows: [] }); // record attempt

      const res = await backfillOrphanNetworkFromWigle('00:11:22');
      expect(res.status).toBe('no_wigle_match');
    });

    it('should return error on API non-ok status', async () => {
      adminQuery.mockResolvedValueOnce({ rows: [{ bssid: '00:11:22', type: 'WIFI' }] });
      fetchUpstream.mockResolvedValueOnce({
        ok: false,
        status: 500,
        data: { message: 'err' },
      });
      adminQuery.mockResolvedValueOnce({ rows: [] }); // record attempt

      const res = await backfillOrphanNetworkFromWigle('00:11:22');
      expect(res.status).toBe('error');
    });

    it('should successfully backfill network', async () => {
      // First query to get orphan
      adminQuery.mockResolvedValueOnce({ rows: [{ bssid: '00:11:22', type: 'WIFI' }] });

      const wigleData = {
        success: true,
        networkId: 'NET1',
        locationClusters: [
          {
            locations: [{ ssid: 'test', lat: 1, lon: 1 }],
          },
        ],
      };

      fetchUpstream.mockResolvedValueOnce({ ok: true, status: 200, data: wigleData });

      wigleService.importWigleV3NetworkDetail.mockResolvedValueOnce();
      importObservations.mockResolvedValueOnce({ newCount: 1, totalCount: 1, failedCount: 0 });
      wigleService.getWigleObservations.mockResolvedValueOnce({ total: 1 });
      // record attempt query
      adminQuery.mockResolvedValueOnce({ rows: [] });

      const res = await backfillOrphanNetworkFromWigle('00:11:22');
      expect(res.ok).toBe(true);
      expect(res.status).toBe('wigle_match_imported_v3');
      expect(res.importedObservations).toBe(1);
    });

    it('should handle API rate limit response', async () => {
      adminQuery.mockResolvedValueOnce({ rows: [{ bssid: '00:11:22', type: 'WIFI' }] });
      fetchUpstream.mockResolvedValueOnce({
        ok: false,
        status: 429,
        data: { success: false, message: 'too many queries' },
      });

      await expect(backfillOrphanNetworkFromWigle('00:11:22')).rejects.toThrow('rate limit');
    });
  });
});

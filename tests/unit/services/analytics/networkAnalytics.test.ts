/**
 * Network Analytics Unit Tests
 */

export {};

const { query } = require('../../../../server/src/config/database');
const networkAnalytics = require('../../../../server/src/services/analytics/networkAnalytics');
const { DatabaseError } = require('../../../../server/src/errors/AppError');

jest.mock('../../../../server/src/config/database', () => ({
  query: jest.fn(),
}));

describe('Network Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNetworkTypes()', () => {
    it('should return network type distribution', async () => {
      const mockRows = [
        { network_type: 'WiFi', count: '100' },
        { network_type: 'BLE', count: '50' },
      ];
      query.mockResolvedValueOnce({ rows: mockRows });

      const result = await networkAnalytics.getNetworkTypes();

      expect(result).toEqual([
        { type: 'WiFi', count: 100 },
        { type: 'BLE', count: 50 },
      ]);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('CASE'));
      expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM app.networks'));
    });

    it('should throw DatabaseError on query failure', async () => {
      query.mockRejectedValueOnce(new Error('DB Error'));
      await expect(networkAnalytics.getNetworkTypes()).rejects.toThrow(DatabaseError);
    });
  });

  describe('getSecurityDistribution()', () => {
    it('should return security distribution', async () => {
      const mockRows = [
        { security_type: 'WPA2-P', count: '80' },
        { security_type: 'OPEN', count: '20' },
      ];
      query.mockResolvedValueOnce({ rows: mockRows });

      const result = await networkAnalytics.getSecurityDistribution();

      expect(result).toEqual([
        { type: 'WPA2-P', count: 80 },
        { type: 'OPEN', count: 20 },
      ]);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('capabilities ILIKE'));
    });

    it('should throw DatabaseError on query failure', async () => {
      query.mockRejectedValueOnce(new Error('DB Error'));
      await expect(networkAnalytics.getSecurityDistribution()).rejects.toThrow(DatabaseError);
    });
  });

  describe('getTopNetworks()', () => {
    it('should return top networks with default limit', async () => {
      const mockRows = [
        {
          bssid: 'AA:BB:CC:DD:EE:FF',
          ssid: 'Test WiFi',
          type: 'W',
          signal: -50,
          observations: '500',
          first_seen: '2023-01-01',
          last_seen: '2023-01-02',
        },
      ];
      query.mockResolvedValueOnce({ rows: mockRows });

      const result = await networkAnalytics.getTopNetworks();

      expect(result).toEqual([
        {
          bssid: 'AA:BB:CC:DD:EE:FF',
          ssid: 'Test WiFi',
          type: 'W',
          signal: -50,
          observations: 500,
          firstSeen: '2023-01-01',
          lastSeen: '2023-01-02',
        },
      ]);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('LIMIT $1'), [100]);
    });

    it('should use provided limit', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      await networkAnalytics.getTopNetworks(50);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('LIMIT $1'), [50]);
    });

    it('should handle hidden SSIDs', async () => {
      const mockRows = [
        {
          bssid: 'AA:BB:CC:DD:EE:FF',
          ssid: null,
          type: 'W',
          observations: '10',
        },
      ];
      query.mockResolvedValueOnce({ rows: mockRows });

      const result = await networkAnalytics.getTopNetworks();
      expect(result[0].ssid).toBe('<Hidden>');
    });

    it('should throw DatabaseError on query failure', async () => {
      query.mockRejectedValueOnce(new Error('DB Error'));
      await expect(networkAnalytics.getTopNetworks()).rejects.toThrow(DatabaseError);
    });
  });

  describe('getDashboardStats()', () => {
    it('should return dashboard statistics', async () => {
      const totalNetworksMock = { rows: [{ count: '1000' }] };
      const radioTypesMock = {
        rows: [
          { radio_type: 'WiFi', count: '600' },
          { radio_type: 'BLE', count: '200' },
          { radio_type: 'BT', count: '100' },
          { radio_type: 'LTE', count: '50' },
          { radio_type: 'GSM', count: '30' },
          { radio_type: 'NR', count: '20' },
        ],
      };

      query.mockResolvedValueOnce(totalNetworksMock);
      query.mockResolvedValueOnce(radioTypesMock);

      const result = await networkAnalytics.getDashboardStats();

      expect(result).toEqual({
        totalNetworks: 1000,
        threatsCount: 0,
        surveillanceCount: 0,
        enrichedCount: 0,
        wifiCount: 600,
        bleCount: 200,
        btCount: 100,
        lteCount: 50,
        gsmCount: 30,
        nrCount: 20,
      });

      expect(query).toHaveBeenCalledTimes(2);
    });

    it('should handle empty results gracefully', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      query.mockResolvedValueOnce({ rows: [] });

      const result = await networkAnalytics.getDashboardStats();

      expect(result.totalNetworks).toBe(0);
      expect(result.wifiCount).toBe(0);
    });

    it('should throw DatabaseError if any query fails', async () => {
      query.mockRejectedValueOnce(new Error('DB Error'));
      await expect(networkAnalytics.getDashboardStats()).rejects.toThrow(DatabaseError);
    });
  });
});

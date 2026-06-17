jest.mock('../../../../server/src/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../../../../server/src/services/wigle/database', () => ({
  getWigleNetworkByBSSID: jest.fn(),
}));

jest.mock('../../../../server/src/services/wigle/persistence', () => ({
  getStoredWigleDetail: jest.fn(),
}));

import {
  getWiglePageNetwork,
  getWiglePageNetworkFromMv,
  getWigleDetail,
} from '../../../../server/src/services/wigle/detail';
import { query } from '../../../../server/src/config/database';

describe('wigle/detail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWiglePageNetwork', () => {
    it('returns null when no v3 or v2 data found', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await getWiglePageNetwork('aa:bb:cc:dd:ee:ff');
      expect(result).toBeNull();
    });

    it('normalizes netid to uppercase', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ netid: 'test' }] })
        .mockResolvedValue({ rows: [] })
        .mockResolvedValue({ rows: [] })
        .mockResolvedValue({ rows: [] })
        .mockResolvedValue({ rows: [] });

      await getWiglePageNetwork('aa:bb:cc:dd:ee:ff');
      expect(query).toHaveBeenCalled();
    });

    it('trims whitespace from netid', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [] });

      await getWiglePageNetwork('  aa:bb:cc:dd:ee:ff  ');
      expect(query).toHaveBeenCalled();
    });

    it('returns network data when v3 exists', async () => {
      const v3Data = {
        netid: 'aa:bb:cc:dd:ee:ff',
        oui_manufacturer: 'Apple',
        trilat: 40.7128,
        trilon: -74.006,
      };

      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [v3Data] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await getWiglePageNetwork('aa:bb:cc:dd:ee:ff');
      expect(result).not.toBeNull();
      expect(result?.wigle).toBeDefined();
    });

    it('returns network data when v2 exists', async () => {
      const v2Data = {
        netid: 'aa:bb:cc:dd:ee:ff',
        oui_manufacturer: 'Samsung',
        trilat: 40.7128,
        trilong: -74.006,
      };

      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [v2Data] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await getWiglePageNetwork('aa:bb:cc:dd:ee:ff');
      expect(result).not.toBeNull();
    });

    it('uses v3 centroid when available', async () => {
      const v3Data = { netid: 'aa:bb:cc:dd:ee:ff' };
      const temporal = {
        wigle_v3_observation_count: 10,
        wigle_v3_centroid_lat: 40.7128,
        wigle_v3_centroid_lon: -74.006,
      };

      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [v3Data] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [temporal] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await getWiglePageNetwork('aa:bb:cc:dd:ee:ff');
      expect(result?.wigle).toBeDefined();
    });
  });
});

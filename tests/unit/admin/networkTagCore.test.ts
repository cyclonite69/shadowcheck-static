/**
 * Network Tag Core Unit Tests
 */
export {};

const {
  upsertNetworkTag,
  markNetworkInvestigate,
  deleteNetworkTag,
} = require('../../../server/src/services/admin/networkTagCore');
const { adminQuery } = require('../../../server/src/services/adminDbService');

jest.mock('../../../server/src/services/adminDbService');

describe('networkTagCore Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('upsertNetworkTag', () => {
    it('should call adminQuery with correct SQL and parameters', async () => {
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [{ bssid: '00:11:22:33:44:55' }] });
      await upsertNetworkTag('00:11:22:33:44:55', true, 'test', 'THREAT', 0.9, 'notes');
      expect(adminQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO app.network_tags'),
        expect.arrayContaining(['00:11:22:33:44:55', true, 'test', 'THREAT', 0.9, 'notes'])
      );
    });
  });

  describe('markNetworkInvestigate', () => {
    it('should upsert investigate tag with conflict resolution logic', async () => {
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [{ bssid: '00:11:22:33:44:55' }] });
      await markNetworkInvestigate('00:11:22:33:44:55');
      expect(adminQuery).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (bssid) DO UPDATE'),
        expect.arrayContaining([
          '00:11:22:33:44:55',
          true,
          'manual',
          'INVESTIGATE',
          0.5,
          'Flagged for investigation',
        ])
      );
    });
  });

  describe('deleteNetworkTag', () => {
    it('should delete a tag via adminQuery', async () => {
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
      const result = await deleteNetworkTag('00:11:22:33:44:55');
      expect(result).toBe(true);
      expect(adminQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM app.network_tags WHERE bssid = $1'),
        ['00:11:22:33:44:55']
      );
    });
  });
});

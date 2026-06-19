import { SqliteImportReader } from '../../../../../etl/load/sqlite/reader';

const mockSqliteGet = jest.fn();
const mockSqliteAll = jest.fn();
const mockSqliteClose = jest.fn();

jest.mock('sqlite3', () => ({
  verbose: () => ({
    Database: class {
      get = mockSqliteGet;
      all = mockSqliteAll;
      close = mockSqliteClose;
    },
  }),
  OPEN_READONLY: 1,
}));

describe('sqlite/reader', () => {
  const reader = new SqliteImportReader('/tmp/test.sqlite');

  beforeEach(() => {
    mockSqliteGet.mockReset();
    mockSqliteAll.mockReset();
    mockSqliteClose.mockReset();
  });

  describe('assertLocationTableExists', () => {
    it('throws an error if location table count is 0', async () => {
      mockSqliteGet.mockImplementation((sql: string, callback: Function) => {
        callback(null, { count: 0 });
      });

      await expect(reader.assertLocationTableExists()).rejects.toThrow(
        'SQLite database missing "location" table'
      );
      expect(mockSqliteClose).toHaveBeenCalled();
    });

    it('resolves without error if location table count is greater than 0', async () => {
      mockSqliteGet.mockImplementation((sql: string, callback: Function) => {
        callback(null, { count: 1 });
      });

      await expect(reader.assertLocationTableExists()).resolves.toBeUndefined();
    });

    it('propagates SQLite errors', async () => {
      mockSqliteGet.mockImplementation((sql: string, callback: Function) => {
        callback(new Error('Syntax error'));
      });

      await expect(reader.assertLocationTableExists()).rejects.toThrow(
        'SQLite error: Syntax error'
      );
    });
  });

  describe('countLocations', () => {
    it('returns the count of locations', async () => {
      mockSqliteGet.mockImplementation((sql: string, callback: Function) => {
        callback(null, { count: 42 });
      });

      const count = await reader.countLocations();
      expect(count).toBe(42);
      expect(mockSqliteGet).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM location',
        expect.any(Function)
      );
    });

    it('returns 0 if count is missing', async () => {
      mockSqliteGet.mockImplementation((sql: string, callback: Function) => {
        callback(null, {});
      });

      const count = await reader.countLocations();
      expect(count).toBe(0);
    });
  });

  describe('countLocationsAtOrBefore', () => {
    it('returns the count of locations at/before timeMs', async () => {
      mockSqliteGet.mockImplementation((sql: string, params: any[], callback: Function) => {
        callback(null, { count: 15 });
      });

      const count = await reader.countLocationsAtOrBefore(10000);
      expect(count).toBe(15);
      expect(mockSqliteGet).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM location WHERE time <= ?',
        [10000],
        expect.any(Function)
      );
    });
  });

  describe('loadNetworkCache', () => {
    it('loads and structures the network rows in a uppercase BSSID map', async () => {
      const mockRows = [
        { bssid: 'aa:bb:cc:dd:ee:ff', ssid: 'net1' },
        { bssid: '11:22:33:44:55:66', ssid: 'net2' },
      ];
      mockSqliteAll.mockImplementation((sql: string, callback: Function) => {
        callback(null, mockRows);
      });

      const cache = await reader.loadNetworkCache();
      expect(cache.size).toBe(2);
      expect(cache.get('AA:BB:CC:DD:EE:FF')).toEqual(mockRows[0]);
      expect(cache.get('11:22:33:44:55:66')).toEqual(mockRows[1]);
      expect(mockSqliteAll).toHaveBeenCalledWith('SELECT * FROM network', expect.any(Function));
    });

    it('handles empty results and database errors', async () => {
      mockSqliteAll.mockImplementation((sql: string, callback: Function) => {
        callback(new Error('Table not found'));
      });

      await expect(reader.loadNetworkCache()).rejects.toThrow('SQLite error: Table not found');
    });
  });

  describe('fetchNewObservations', () => {
    it('queries locations since a timeMs with ASC sorting', async () => {
      const mockObs = [{ _id: 1, time: 20000 }];
      mockSqliteAll.mockImplementation((sql: string, params: any[], callback: Function) => {
        callback(null, mockObs);
      });

      const results = await reader.fetchNewObservations(15000);
      expect(results).toEqual(mockObs);
      expect(mockSqliteAll).toHaveBeenCalledWith(
        'SELECT * FROM location WHERE time > ? ORDER BY time ASC',
        [15000],
        expect.any(Function)
      );
    });
  });
});

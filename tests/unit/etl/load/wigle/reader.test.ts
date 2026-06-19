import { SqliteReader } from '../../../../../etl/load/wigle/reader';

const mockSqliteGet = jest.fn();
const mockSqliteAll = jest.fn();
const mockSqliteClose = jest.fn();

jest.mock('sqlite3', () => ({
  Database: class {
    get = mockSqliteGet;
    all = mockSqliteAll;
    close = mockSqliteClose;
  },
  OPEN_READONLY: 1,
}));

describe('wigle/reader', () => {
  const reader = new SqliteReader('/tmp/wigle_test.sqlite');

  beforeEach(() => {
    mockSqliteGet.mockReset();
    mockSqliteAll.mockReset();
    mockSqliteClose.mockReset();
  });

  describe('getLatestTimestamp', () => {
    it('returns the latest timestamp if present', async () => {
      mockSqliteGet.mockImplementation((sql: string, callback: Function) => {
        callback(null, { latest: 1234567890 });
      });

      const latest = await reader.getLatestTimestamp();
      expect(latest).toBe(1234567890);
      expect(mockSqliteGet).toHaveBeenCalledWith(
        'SELECT MAX(time) as latest FROM location',
        expect.any(Function)
      );
      expect(mockSqliteClose).toHaveBeenCalled();
    });

    it('returns 0 if latest is null or missing', async () => {
      mockSqliteGet.mockImplementation((sql: string, callback: Function) => {
        callback(null, {});
      });

      const latest = await reader.getLatestTimestamp();
      expect(latest).toBe(0);
    });

    it('rejects if a database error occurs', async () => {
      mockSqliteGet.mockImplementation((sql: string, callback: Function) => {
        callback(new Error('DB read error'));
      });

      await expect(reader.getLatestTimestamp()).rejects.toThrow('DB read error');
    });
  });

  describe('getTotalCount', () => {
    it('returns total count if present', async () => {
      mockSqliteGet.mockImplementation((sql: string, callback: Function) => {
        callback(null, { count: 100 });
      });

      const count = await reader.getTotalCount();
      expect(count).toBe(100);
      expect(mockSqliteGet).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM location',
        expect.any(Function)
      );
    });

    it('returns 0 if count is missing', async () => {
      mockSqliteGet.mockImplementation((sql: string, callback: Function) => {
        callback(null, {});
      });

      const count = await reader.getTotalCount();
      expect(count).toBe(0);
    });

    it('rejects if a database error occurs', async () => {
      mockSqliteGet.mockImplementation((sql: string, callback: Function) => {
        callback(new Error('DB error'));
      });

      await expect(reader.getTotalCount()).rejects.toThrow('DB error');
    });
  });

  describe('getAlreadyImportedCount', () => {
    it('returns the count of rows imported at or before timestamp', async () => {
      mockSqliteGet.mockImplementation((sql: string, params: any[], callback: Function) => {
        callback(null, { count: 45 });
      });

      const count = await reader.getAlreadyImportedCount(5000);
      expect(count).toBe(45);
      expect(mockSqliteGet).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM location WHERE time <= ?',
        [5000],
        expect.any(Function)
      );
    });

    it('returns 0 if count is missing', async () => {
      mockSqliteGet.mockImplementation((sql: string, params: any[], callback: Function) => {
        callback(null, {});
      });

      const count = await reader.getAlreadyImportedCount(5000);
      expect(count).toBe(0);
    });

    it('rejects on database error', async () => {
      mockSqliteGet.mockImplementation((sql: string, params: any[], callback: Function) => {
        callback(new Error('query failed'));
      });

      await expect(reader.getAlreadyImportedCount(5000)).rejects.toThrow('query failed');
    });
  });

  describe('loadNetworkCache', () => {
    it('loads networks and indexes them by uppercase BSSID', async () => {
      const mockRows = [
        { bssid: 'cc:dd:ee:ff:00:11', ssid: 'net1' },
        { bssid: '22:33:44:55:66:77', ssid: 'net2' },
      ];
      mockSqliteAll.mockImplementation((sql: string, callback: Function) => {
        callback(null, mockRows);
      });

      const cache = await reader.loadNetworkCache();
      expect(cache.size).toBe(2);
      expect(cache.get('CC:DD:EE:FF:00:11')).toEqual(mockRows[0]);
      expect(cache.get('22:33:44:55:66:77')).toEqual(mockRows[1]);
      expect(mockSqliteAll).toHaveBeenCalledWith('SELECT * FROM network', expect.any(Function));
    });

    it('rejects on database error', async () => {
      mockSqliteAll.mockImplementation((sql: string, callback: Function) => {
        callback(new Error('Network read failed'));
      });

      await expect(reader.loadNetworkCache()).rejects.toThrow('Network read failed');
    });
  });

  describe('fetchNewObservations', () => {
    it('queries rows after a given timestamp and orders them ASC', async () => {
      const mockObs = [{ _id: 1, time: 6000 }];
      mockSqliteAll.mockImplementation((sql: string, params: any[], callback: Function) => {
        callback(null, mockObs);
      });

      const results = await reader.fetchNewObservations(5000);
      expect(results).toEqual(mockObs);
      expect(mockSqliteAll).toHaveBeenCalledWith(
        'SELECT * FROM location WHERE time > ? ORDER BY time ASC',
        [5000],
        expect.any(Function)
      );
    });

    it('returns empty array if results are null', async () => {
      mockSqliteAll.mockImplementation((sql: string, params: any[], callback: Function) => {
        callback(null, null);
      });

      const results = await reader.fetchNewObservations(5000);
      expect(results).toEqual([]);
    });

    it('rejects on database error', async () => {
      mockSqliteAll.mockImplementation((sql: string, params: any[], callback: Function) => {
        callback(new Error('Obs fetch failed'));
      });

      await expect(reader.fetchNewObservations(5000)).rejects.toThrow('Obs fetch failed');
    });
  });
});

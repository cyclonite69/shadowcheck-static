import { Pool } from 'pg';
import {
  upsertNetworks,
  backfillMissingNetworksFromObservations,
  recomputeBestPositions,
  moveOrphanNetworksToHoldingTable,
} from '../../../../../etl/load/sqlite/networkReconciliation';
import type { SqliteNetworkRow } from '../../../../../etl/load/sqlite/types';

const mockSqliteAll = jest.fn();
const mockSqliteClose = jest.fn();

jest.mock('sqlite3', () => ({
  verbose: () => ({
    Database: class {
      all = mockSqliteAll;
      close = mockSqliteClose;
    },
  }),
  OPEN_READONLY: 1,
}));

describe('sqlite/networkReconciliation', () => {
  let mockPool: Partial<Pool>;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let mockNetworkCache: Map<string, SqliteNetworkRow>;

  beforeEach(() => {
    mockPool = {
      query: jest.fn().mockResolvedValue({ rowCount: 1 }),
    };
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockNetworkCache = new Map();
    mockSqliteAll.mockReset();
    mockSqliteClose.mockReset();
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('upsertNetworks', () => {
    it('queries unique BSSIDs from SQLite and upserts them successfully', async () => {
      mockSqliteAll.mockImplementation((sql: string, params: any[], callback: Function) => {
        callback(null, [{ bssid: 'AA:BB:CC:DD:EE:FF' }, { bssid: '11:22:33:44:55:66' }]);
      });

      mockNetworkCache.set('AA:BB:CC:DD:EE:FF', {
        bssid: 'AA:BB:CC:DD:EE:FF',
        ssid: 'net1',
        frequency: 2412,
        capabilities: 'WPA',
        lasttime: 123456,
        lastlat: 37,
        lastlon: -122,
        type: 'W',
        bestlevel: -50,
        bestlat: 37,
        bestlon: -122,
        rcois: '',
        mfgrid: 0,
        service: '',
      });

      await upsertNetworks(mockPool as Pool, 'test.db', 1000, mockNetworkCache, false);

      expect(mockSqliteAll).toHaveBeenCalledWith(
        expect.stringContaining('SELECT DISTINCT UPPER(bssid)'),
        [1000],
        expect.any(Function)
      );

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Upserted 2 networks'));
    });

    it('handles sqlite database query error', async () => {
      mockSqliteAll.mockImplementation((sql: string, params: any[], callback: Function) => {
        callback(new Error('SQLite file corrupt'));
      });

      await expect(
        upsertNetworks(mockPool as Pool, 'test.db', 1000, mockNetworkCache, false)
      ).rejects.toThrow('SQLite file corrupt');
    });

    it('handles query failures and logs errors to console when debug is true', async () => {
      mockSqliteAll.mockImplementation((sql: string, params: any[], callback: Function) => {
        callback(null, [{ bssid: 'AA:BB:CC:DD:EE:FF' }]);
      });

      mockPool.query = jest.fn().mockRejectedValue(new Error('Foreign key violation'));

      await upsertNetworks(mockPool as Pool, 'test.db', 1000, mockNetworkCache, true);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Network upsert failed for AA:BB:CC:DD:EE:FF: Foreign key violation'
        )
      );
    });

    it('handles query failures without logging to console when debug is false', async () => {
      mockSqliteAll.mockImplementation((sql: string, params: any[], callback: Function) => {
        callback(null, [{ bssid: 'AA:BB:CC:DD:EE:FF' }]);
      });

      mockPool.query = jest.fn().mockRejectedValue(new Error('Foreign key violation'));

      await upsertNetworks(mockPool as Pool, 'test.db', 1000, mockNetworkCache, false);

      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe('backfillMissingNetworksFromObservations', () => {
    it('executes backfill queries and prints counts', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rowCount: 5 });

      await backfillMissingNetworksFromObservations(mockPool as Pool, 'tag1', 12345);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO app.networks'),
        ['tag1', 12345]
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Backfilled 5 missing network(s)')
      );
    });
  });

  describe('recomputeBestPositions', () => {
    it('executes update query and prints rowCount', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rowCount: 12 });

      await recomputeBestPositions(mockPool as Pool);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE app.networks n SET')
      );
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Updated 12 network(s)'));
    });
  });

  describe('moveOrphanNetworksToHoldingTable', () => {
    it('executes insert and delete queries and logs preserved/removed counts', async () => {
      mockPool.query = jest
        .fn()
        .mockResolvedValueOnce({ rowCount: 3 }) // insert into holding
        .mockResolvedValueOnce({ rowCount: 3 }); // delete from main

      await moveOrphanNetworksToHoldingTable(mockPool as Pool);

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Preserved 3 orphan network(s)'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Removed 3 orphan network(s)'));
    });
  });
});

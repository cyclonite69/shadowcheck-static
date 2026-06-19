/**
 * Unit tests for sqlite-import
 */

// 1. Define shared mock instances
const mockQuery = jest.fn();
const mockEnd = jest.fn().mockResolvedValue(undefined);

const mockSqliteGet = jest.fn();
const mockSqliteAll = jest.fn();
const mockSqliteClose = jest.fn((cb: any) => cb && cb());

const mockExistsSync = jest.fn().mockReturnValue(true);

// 2. Setup Mocks
jest.mock('pg', () => {
  return {
    Pool: class {
      query = mockQuery;
      end = mockEnd;
    },
  };
});

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

jest.mock('fs', () => ({
  __esModule: true,
  existsSync: mockExistsSync,
  default: {
    existsSync: mockExistsSync,
  },
}));

jest.mock('../../etl/loadEnv', () => ({}));
jest.mock('../../etl/load/sqlite/importObservations', () => ({
  importObservationRows: jest.fn(),
}));
jest.mock('../../etl/load/sqlite/schemaSetup', () => ({
  ensureDeviceSource: jest.fn(),
  ensureNetworksOrphansTable: jest.fn(),
}));
jest.mock('../../etl/load/sqlite/networkReconciliation', () => ({
  upsertNetworks: jest.fn(),
  recomputeBestPositions: jest.fn(),
  backfillMissingNetworksFromObservations: jest.fn(),
  moveOrphanNetworksToHoldingTable: jest.fn(),
}));

// 3. Imports
import { IncrementalImporter } from '../../etl/load/sqlite-import';
import { ensureDeviceSource } from '../../etl/load/sqlite/schemaSetup';
import { importObservationRows } from '../../etl/load/sqlite/importObservations';

describe('sqlite-import - IncrementalImporter', () => {
  const sqliteFile = '/tmp/test.sqlite';
  const sourceTag = 'test_source';
  let importer: IncrementalImporter;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
    importer = new IncrementalImporter(sqliteFile, sourceTag);

    // Silence console
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('completes success path correctly', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ user: 'admin' }] }); // validateInputs
    mockSqliteGet.mockImplementationOnce((_sql: any, cb: any) => cb(null, { count: 1 })); // validateInputs

    mockQuery.mockResolvedValueOnce({ rows: [{ latest_ms: '1000' }] }); // getLatestImportedTime

    mockSqliteGet.mockImplementationOnce((_sql: any, cb: any) => cb(null, { count: 10 })); // total
    mockSqliteGet.mockImplementationOnce((_sql: any, _params: any, cb: any) =>
      cb(null, { count: 5 })
    ); // already

    mockSqliteAll.mockImplementationOnce((_sql: any, cb: any) => cb(null, [{ bssid: 'AA:BB:CC' }])); // loadNetworkCache
    mockSqliteAll.mockImplementationOnce((_sql: any, _params: any, cb: any) =>
      cb(null, [{ _id: 1, bssid: 'AA:BB:CC', time: 2000 }])
    ); // importNewObservations

    (importObservationRows as jest.Mock).mockImplementationOnce(async ({ onProgress }) => {
      if (onProgress) {
        onProgress({ imported: 1, totalRows: 1, startTime: Date.now(), processedRows: 1 });
      }
      return { imported: 1, failed: 0, errors: [] };
    });
    mockQuery.mockResolvedValueOnce({ rows: [{ view_name: 'view1' }] }); // refreshMaterializedViews

    const summary = await importer.start();

    expect(summary.imported).toBe(1);
    expect(mockEnd).toHaveBeenCalled();
    expect(ensureDeviceSource).toHaveBeenCalled();
  });

  it('returns early if no new records to import', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ user: 'admin' }] }); // validateInputs
    mockSqliteGet.mockImplementationOnce((_sql: any, cb: any) => cb(null, { count: 1 })); // validateInputs

    mockQuery.mockResolvedValueOnce({ rows: [{ latest_ms: '1000' }] }); // getLatestImportedTime

    // total = 5, alreadyImported = 5
    mockSqliteGet.mockImplementationOnce((_sql: any, cb: any) => cb(null, { count: 5 }));
    mockSqliteGet.mockImplementationOnce((_sql: any, _params: any, cb: any) =>
      cb(null, { count: 5 })
    );

    const summary = await importer.start();

    expect(summary.imported).toBe(0);
    expect(importObservationRows).not.toHaveBeenCalled();
  });

  it('handles batch insert errors gracefully', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ user: 'admin' }] }); // validateInputs
    mockSqliteGet.mockImplementationOnce((_sql: any, cb: any) => cb(null, { count: 1 })); // validateInputs

    mockQuery.mockResolvedValueOnce({ rows: [{ latest_ms: '0' }] });
    mockSqliteGet.mockImplementationOnce((_sql: any, cb: any) => cb(null, { count: 1 }));
    mockSqliteGet.mockImplementationOnce((_sql: any, _params: any, cb: any) =>
      cb(null, { count: 0 })
    );
    mockSqliteAll.mockImplementationOnce((_sql: any, cb: any) => cb(null, []));
    mockSqliteAll.mockImplementationOnce((_sql: any, _params: any, cb: any) =>
      cb(null, [{ _id: 1, bssid: 'AA:BB:CC', time: 100 }])
    );

    (importObservationRows as jest.Mock).mockResolvedValueOnce({
      imported: 0,
      failed: 1,
      errors: ['Final batch error: Insert failed'],
    });

    const summary = await importer.start();

    expect(summary.imported).toBe(0);
    expect(summary.errors).toContain('Final batch error: Insert failed');
  });

  it('throws error and closes pool when validateInputs fails', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ user: 'admin' }] });
    // Make countLocations throw a sqlite error to fail preflight/validation
    mockSqliteGet.mockImplementationOnce((_sql: any, cb: any) =>
      cb(new Error('SQLite file corrupt'))
    );

    await expect(importer.start()).rejects.toThrow('SQLite file corrupt');
    expect(mockEnd).toHaveBeenCalled();
  });

  it('handles empty latestTimeMs and logs no existing records', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ user: 'admin' }] }); // validateInputs
    mockSqliteGet.mockImplementationOnce((_sql: any, cb: any) => cb(null, { count: 1 })); // validateInputs

    mockQuery.mockResolvedValueOnce({ rows: [{ latest_ms: null }] }); // getLatestImportedTime (evaluates to 0)

    // total = 10, alreadyImported = 0
    mockSqliteGet.mockImplementationOnce((_sql: any, cb: any) => cb(null, { count: 10 }));
    mockSqliteGet.mockImplementationOnce((_sql: any, _params: any, cb: any) =>
      cb(null, { count: 0 })
    );

    mockSqliteAll.mockImplementationOnce((_sql: any, cb: any) => cb(null, []));
    mockSqliteAll.mockImplementationOnce((_sql: any, _params: any, cb: any) => cb(null, []));

    (importObservationRows as jest.Mock).mockResolvedValue({ imported: 0, failed: 0, errors: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] }); // refreshMaterializedViews

    await importer.start();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT COALESCE(MAX(time_ms)'),
      [sourceTag]
    );
  });

  it('handles materialized view refresh failure gracefully', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ user: 'admin' }] }); // validateInputs
    mockSqliteGet.mockImplementationOnce((_sql: any, cb: any) => cb(null, { count: 1 })); // validateInputs
    mockQuery.mockResolvedValueOnce({ rows: [{ latest_ms: '0' }] });
    mockSqliteGet.mockImplementationOnce((_sql: any, cb: any) => cb(null, { count: 5 }));
    mockSqliteGet.mockImplementationOnce((_sql: any, _params: any, cb: any) =>
      cb(null, { count: 0 })
    );
    mockSqliteAll.mockImplementationOnce((_sql: any, cb: any) => cb(null, []));
    mockSqliteAll.mockImplementationOnce((_sql: any, _params: any, cb: any) => cb(null, []));

    (importObservationRows as jest.Mock).mockResolvedValue({ imported: 5, failed: 0, errors: [] });

    // Make refreshing MVs fail
    mockQuery.mockRejectedValueOnce(new Error('MV lock timeout'));

    const summary = await importer.start();
    expect(summary.imported).toBe(5);
    expect(mockEnd).toHaveBeenCalled();
  });
});

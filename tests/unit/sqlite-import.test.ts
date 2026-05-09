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
jest.mock('../../etl/load/sqlite/validateAndEnrich', () => ({
  validateAndEnrich: jest.fn(),
}));
jest.mock('../../etl/load/sqlite/schemaSetup', () => ({
  ensureDeviceSource: jest.fn(),
  ensureNetworksOrphansTable: jest.fn(),
}));
jest.mock('../../etl/load/sqlite/insertObservations', () => ({
  insertBatch: jest.fn(),
}));
jest.mock('../../etl/load/sqlite/networkReconciliation', () => ({
  upsertNetworks: jest.fn(),
  backfillMissingNetworksFromObservations: jest.fn(),
  moveOrphanNetworksToHoldingTable: jest.fn(),
}));

// 3. Imports
import { IncrementalImporter } from '../../etl/load/sqlite-import';
import { ensureDeviceSource } from '../../etl/load/sqlite/schemaSetup';
import { insertBatch } from '../../etl/load/sqlite/insertObservations';
import { validateAndEnrich } from '../../etl/load/sqlite/validateAndEnrich';

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

    (insertBatch as jest.Mock).mockResolvedValue({ inserted: 1, failed: 0, errors: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{ view_name: 'view1' }] }); // refreshMaterializedViews

    (validateAndEnrich as jest.Mock).mockReturnValue({ bssid: 'AA:BB:CC' });

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
    expect(insertBatch).not.toHaveBeenCalled();
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

    (validateAndEnrich as jest.Mock).mockReturnValue({ bssid: 'AA:BB:CC' });
    (insertBatch as jest.Mock).mockRejectedValue(new Error('Insert failed'));

    const summary = await importer.start();

    expect(summary.imported).toBe(0);
    expect(summary.errors).toContain('Final batch error: Insert failed');
  });
});

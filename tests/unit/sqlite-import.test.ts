/**
 * Unit tests for sqlite-import
 */

// 1. Define shared mock instances
const mockPoolInstance = {
  query: jest.fn(),
  end: jest.fn().mockResolvedValue(undefined),
};

const mockSqliteDbInstance = {
  get: jest.fn(),
  all: jest.fn(),
  close: jest.fn((cb: any) => cb && cb()),
};

// 2. Setup doMocks
jest.doMock('pg', () => ({
  Pool: jest.fn(() => mockPoolInstance),
}));

jest.doMock('sqlite3', () => ({
  verbose: jest.fn().mockReturnValue({
    Database: jest.fn(() => mockSqliteDbInstance),
  }),
  OPEN_READONLY: 1,
}));

jest.doMock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
}));

jest.doMock('../../etl/loadEnv', () => ({}));
jest.doMock('../../etl/load/sqlite/validateAndEnrich', () => ({
  validateAndEnrich: jest.fn(),
}));
jest.doMock('../../etl/load/sqlite/schemaSetup', () => ({
  ensureDeviceSource: jest.fn(),
  ensureNetworksOrphansTable: jest.fn(),
}));
jest.doMock('../../etl/load/sqlite/insertObservations', () => ({
  insertBatch: jest.fn(),
}));
jest.doMock('../../etl/load/sqlite/networkReconciliation', () => ({
  upsertNetworks: jest.fn(),
  backfillMissingNetworksFromObservations: jest.fn(),
  moveOrphanNetworksToHoldingTable: jest.fn(),
}));

// 3. Require after mocks
const { IncrementalImporter } = require('../../etl/load/sqlite-import');
const { ensureDeviceSource } = require('../../etl/load/sqlite/schemaSetup');
const { insertBatch } = require('../../etl/load/sqlite/insertObservations');
const { validateAndEnrich } = require('../../etl/load/sqlite/validateAndEnrich');

describe('sqlite-import - IncrementalImporter', () => {
  const sqliteFile = '/tmp/test.sqlite';
  const sourceTag = 'test_source';
  let importer: any;

  beforeEach(() => {
    jest.clearAllMocks();
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
    mockPoolInstance.query.mockResolvedValueOnce({ rows: [{ user: 'admin' }] }); // validateInputs
    mockSqliteDbInstance.get.mockImplementationOnce((sql: any, cb: any) => cb(null, { count: 1 })); // validateInputs

    mockPoolInstance.query.mockResolvedValueOnce({ rows: [{ latest_ms: '1000' }] }); // getLatestImportedTime

    mockSqliteDbInstance.get.mockImplementationOnce((sql: any, cb: any) => cb(null, { count: 10 })); // total
    mockSqliteDbInstance.get.mockImplementationOnce((sql: any, params: any, cb: any) =>
      cb(null, { count: 5 })
    ); // already

    mockSqliteDbInstance.all.mockImplementationOnce((sql: any, cb: any) =>
      cb(null, [{ bssid: 'AA:BB:CC' }])
    ); // loadNetworkCache
    mockSqliteDbInstance.all.mockImplementationOnce((sql: any, params: any, cb: any) =>
      cb(null, [{ _id: 1, bssid: 'AA:BB:CC', time: 2000 }])
    ); // importNewObservations

    insertBatch.mockResolvedValue({ inserted: 1, failed: 0, errors: [] });
    mockPoolInstance.query.mockResolvedValueOnce({ rows: [{ view_name: 'view1' }] }); // refreshMaterializedViews

    validateAndEnrich.mockReturnValue({ bssid: 'AA:BB:CC' });

    const summary = await importer.start();

    expect(summary.imported).toBe(1);
    expect(mockPoolInstance.end).toHaveBeenCalled();
    expect(ensureDeviceSource).toHaveBeenCalled();
  });
});

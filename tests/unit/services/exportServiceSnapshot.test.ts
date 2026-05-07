export {};

const mockQueryAppTableNames = jest.fn();
const mockQueryTableRowCount = jest.fn();
const mockQueryTableRows = jest.fn();

jest.mock('../../../server/src/repositories/exportRepository', () => ({
  queryObservationsForCSV: jest.fn(),
  queryObservationsForJSON: jest.fn(),
  queryNetworksForJSON: jest.fn(),
  queryObservationsForGeoJSON: jest.fn(),
  queryObservationsForKML: jest.fn(),
  queryAppTableNames: mockQueryAppTableNames,
  queryTableRowCount: mockQueryTableRowCount,
  queryTableRows: mockQueryTableRows,
}));

const { getFullDatabaseSnapshot } = require('../../../server/src/services/exportService');

beforeEach(() => jest.clearAllMocks());

describe('getFullDatabaseSnapshot', () => {
  test('returns schema, exported_at, limits, and tables', async () => {
    mockQueryAppTableNames.mockResolvedValue(['networks']);
    mockQueryTableRowCount.mockResolvedValue(5);
    mockQueryTableRows.mockResolvedValue([{}, {}, {}, {}, {}]);

    const result = await getFullDatabaseSnapshot();

    expect(result.schema).toBe('app');
    expect(result.exported_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.limits.maxRowsPerTable).toBeGreaterThan(0);
    expect(result.limits.maxRowsTotal).toBeGreaterThan(0);
    expect(result.tables).toHaveProperty('networks');
  });

  test('truncated=false when all rows fit within limits', async () => {
    mockQueryAppTableNames.mockResolvedValue(['networks']);
    mockQueryTableRowCount.mockResolvedValue(3);
    mockQueryTableRows.mockResolvedValue([{}, {}, {}]); // all 3 returned

    const result = await getFullDatabaseSnapshot();

    expect(result.truncated).toBe(false);
    expect(result.tables['networks'].truncated).toBe(false);
    expect(result.tables['networks'].exportedRowCount).toBe(3);
    expect(result.tables['networks'].rowCount).toBe(3);
  });

  test('table.truncated=true when exported < rowCount', async () => {
    mockQueryAppTableNames.mockResolvedValue(['observations']);
    mockQueryTableRowCount.mockResolvedValue(1000);
    mockQueryTableRows.mockResolvedValue(Array(500).fill({})); // only 500 returned

    const result = await getFullDatabaseSnapshot();

    expect(result.tables['observations'].truncated).toBe(true);
    expect(result.truncated).toBe(true);
  });

  test('snapshot.truncated=true when any table is truncated', async () => {
    mockQueryAppTableNames.mockResolvedValue(['small', 'big']);
    mockQueryTableRowCount
      .mockResolvedValueOnce(2) // small: fits
      .mockResolvedValueOnce(9999); // big: truncated
    mockQueryTableRows
      .mockResolvedValueOnce([{}, {}]) // small: all rows
      .mockResolvedValueOnce(Array(500).fill({})); // big: partial

    const result = await getFullDatabaseSnapshot();

    expect(result.tables['small'].truncated).toBe(false);
    expect(result.tables['big'].truncated).toBe(true);
    expect(result.truncated).toBe(true);
  });

  test('respects FULL_EXPORT_MAX_ROWS_PER_TABLE env var', async () => {
    process.env.FULL_EXPORT_MAX_ROWS_PER_TABLE = '5';
    mockQueryAppTableNames.mockResolvedValue(['networks']);
    mockQueryTableRowCount.mockResolvedValue(100);
    mockQueryTableRows.mockResolvedValue(Array(5).fill({}));

    await getFullDatabaseSnapshot();

    // exportLimit passed to queryTableRows should be 5
    expect(mockQueryTableRows).toHaveBeenCalledWith('networks', 5);
    delete process.env.FULL_EXPORT_MAX_ROWS_PER_TABLE;
  });

  test('total budget caps export across multiple tables', async () => {
    process.env.FULL_EXPORT_MAX_ROWS_TOTAL = '3';
    mockQueryAppTableNames.mockResolvedValue(['t1', 't2']);
    mockQueryTableRowCount.mockResolvedValue(10);
    // t1 gets 3 rows (exhausts budget), t2 gets 0
    mockQueryTableRows
      .mockResolvedValueOnce([{}, {}, {}]) // t1: 3 rows
      .mockResolvedValueOnce([]); // t2: 0 rows (budget exhausted)

    const result = await getFullDatabaseSnapshot();

    // t2 should have been called with limit=0 (remaining budget)
    expect(mockQueryTableRows).toHaveBeenNthCalledWith(2, 't2', 0);
    expect(result.tables['t2'].exportedRowCount).toBe(0);
    delete process.env.FULL_EXPORT_MAX_ROWS_TOTAL;
  });

  test('handles empty table list', async () => {
    mockQueryAppTableNames.mockResolvedValue([]);

    const result = await getFullDatabaseSnapshot();

    expect(result.tables).toEqual({});
    expect(result.truncated).toBe(false);
  });
});

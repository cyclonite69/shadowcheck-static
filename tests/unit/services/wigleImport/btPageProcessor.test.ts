const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn();

jest.mock('../../../../server/src/config/database', () => {
  return {
    pool: {
      connect: (...args: any[]) => mockConnect(...args),
    },
  };
});

jest.mock('../../../../server/src/services/wigleService', () => ({
  importWigleBtSearchResult: jest.fn(),
}));

jest.mock('../../../../server/src/logging/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const {
  processSuccessfulBtPage,
} = require('../../../../server/src/services/wigleImport/btPageProcessor');
const wigleService = require('../../../../server/src/services/wigleService');

describe('btPageProcessor', () => {
  const mockClient = {
    query: mockQuery,
    release: mockRelease,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnect.mockResolvedValue(mockClient);
    // Default mock implementation for successful queries
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it('successfully processes a page of BT results', async () => {
    const results = [{ netid: 'AA:BB:CC:11:22:33' }, { netid: 'AA:BB:CC:44:55:66' }];
    wigleService.importWigleBtSearchResult.mockResolvedValue(1);

    // Mock the specific return for the final update query
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('UPDATE app.wigle_import_runs')) {
        return Promise.resolve({ rows: [{ id: 1, status: 'in_progress' }] });
      }
      return Promise.resolve({ rows: [] });
    });

    const runResult = await processSuccessfulBtPage(
      1,
      1,
      'cursor1',
      'cursor2',
      results,
      100,
      50,
      false
    );

    expect(runResult).toEqual({ id: 1, status: 'in_progress' });
    expect(mockConnect).toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledWith('BEGIN');
    expect(mockQuery).toHaveBeenCalledWith('COMMIT');
    expect(mockRelease).toHaveBeenCalled();
    expect(wigleService.importWigleBtSearchResult).toHaveBeenCalledTimes(2);
  });

  it('skips bad rows using savepoints', async () => {
    const results = [{ netid: 'GOOD' }, { netid: 'BAD' }];
    wigleService.importWigleBtSearchResult
      .mockResolvedValueOnce(1)
      .mockRejectedValueOnce(new Error('Bad row data'));

    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('UPDATE app.wigle_import_runs')) {
        return Promise.resolve({ rows: [{ id: 1, status: 'in_progress' }] });
      }
      return Promise.resolve({ rows: [] });
    });

    const runResult = await processSuccessfulBtPage(
      1,
      1,
      'cursor1',
      'cursor2',
      results,
      100,
      50,
      false
    );

    expect(runResult).toBeDefined();
    expect(mockQuery).toHaveBeenCalledWith('ROLLBACK TO SAVEPOINT row_insert');
    expect(mockQuery).toHaveBeenCalledWith('COMMIT');
    expect(mockRelease).toHaveBeenCalled();
  });

  it('rolls back completely if a major database error occurs', async () => {
    const results = [{ netid: 'A' }];

    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('INSERT INTO app.wigle_import_run_pages')) {
        throw new Error('Fatal DB Error');
      }
      return Promise.resolve({ rows: [] });
    });

    await expect(
      processSuccessfulBtPage(1, 1, 'cursor1', 'cursor2', results, 100, 50, false)
    ).rejects.toThrow('Fatal DB Error');

    expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(mockRelease).toHaveBeenCalled();
  });
});

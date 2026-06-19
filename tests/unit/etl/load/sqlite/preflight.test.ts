import * as fs from 'fs';
import { Pool } from 'pg';
import { runImportPreflight } from '../../../../../etl/load/sqlite/preflight';
import type { SqliteImportReaderLike } from '../../../../../etl/load/sqlite/preflight';

jest.mock('fs', () => {
  const original = jest.requireActual('fs');
  return {
    ...original,
    existsSync: jest.fn(),
  };
});

const mockExistsSync = fs.existsSync as jest.Mock;

describe('sqlite/preflight', () => {
  let mockPool: Partial<Pool>;
  let mockSqliteReader: jest.Mocked<SqliteImportReaderLike>;

  beforeEach(() => {
    mockPool = {
      query: jest.fn().mockResolvedValue({
        rows: [{ now: new Date(), user: 'shadowcheck_admin' }],
      }),
    };
    mockSqliteReader = {
      assertLocationTableExists: jest.fn().mockResolvedValue(undefined),
    };
    mockExistsSync.mockReset();
  });

  it('throws an error if the sqlite file does not exist (using mock options.existsSync)', async () => {
    await expect(
      runImportPreflight({
        sqliteFile: '/tmp/missing.sqlite',
        sourceTag: 'test_tag',
        pool: mockPool as Pool,
        sqliteReader: mockSqliteReader,
        existsSync: () => false,
      })
    ).rejects.toThrow('SQLite file not found: /tmp/missing.sqlite');
  });

  it('throws an error if the sqlite file does not exist (falling back to fs.existsSync)', async () => {
    mockExistsSync.mockReturnValue(false);

    await expect(
      runImportPreflight({
        sqliteFile: '/tmp/missing.sqlite',
        sourceTag: 'test_tag',
        pool: mockPool as Pool,
        sqliteReader: mockSqliteReader,
        // existsSync is omitted to force fallback
      })
    ).rejects.toThrow('SQLite file not found: /tmp/missing.sqlite');

    expect(mockExistsSync).toHaveBeenCalledWith('/tmp/missing.sqlite');
  });

  it('throws an error if sourceTag is invalid', async () => {
    await expect(
      runImportPreflight({
        sqliteFile: '/tmp/exists.sqlite',
        sourceTag: 'invalid@tag!',
        pool: mockPool as Pool,
        sqliteReader: mockSqliteReader,
        existsSync: () => true,
      })
    ).rejects.toThrow('Source tag must be alphanumeric with underscores/hyphens only');
  });

  it('throws an error if the database query fails', async () => {
    mockPool.query = jest.fn().mockRejectedValue(new Error('Connection refused'));

    await expect(
      runImportPreflight({
        sqliteFile: '/tmp/exists.sqlite',
        sourceTag: 'test-tag',
        pool: mockPool as Pool,
        sqliteReader: mockSqliteReader,
        existsSync: () => true,
      })
    ).rejects.toThrow('PostgreSQL connection failed: Connection refused');
  });

  it('throws an error if sqlite assertion fails', async () => {
    mockSqliteReader.assertLocationTableExists.mockRejectedValue(
      new Error('Location table missing')
    );

    await expect(
      runImportPreflight({
        sqliteFile: '/tmp/exists.sqlite',
        sourceTag: 'test-tag',
        pool: mockPool as Pool,
        sqliteReader: mockSqliteReader,
        existsSync: () => true,
      })
    ).rejects.toThrow('Location table missing');
  });

  it('returns current postgres user on success', async () => {
    const result = await runImportPreflight({
      sqliteFile: '/tmp/exists.sqlite',
      sourceTag: 'test-tag_123',
      pool: mockPool as Pool,
      sqliteReader: mockSqliteReader,
      existsSync: () => true,
    });

    expect(result).toEqual({ postgresUser: 'shadowcheck_admin' });
    expect(mockPool.query).toHaveBeenCalledWith('SELECT NOW() as now, current_user as user');
    expect(mockSqliteReader.assertLocationTableExists).toHaveBeenCalled();
  });
});

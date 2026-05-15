import type { Pool } from 'pg';
import { runImportPreflight, type SqliteImportReaderLike } from '../../etl/load/sqlite/preflight';

describe('sqlite import preflight helpers', () => {
  const sqliteReader: SqliteImportReaderLike = {
    assertLocationTableExists: jest.fn().mockResolvedValue(undefined),
  };

  const pool = {
    query: jest.fn(),
  } as unknown as Pool;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns postgres user after successful preflight', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rows: [{ user: 'shadowcheck_admin' }] });

    await expect(
      runImportPreflight({
        sqliteFile: '/tmp/test.sqlite',
        sourceTag: 'valid_source',
        pool,
        sqliteReader,
        existsSync: () => true,
      })
    ).resolves.toEqual({ postgresUser: 'shadowcheck_admin' });

    expect(sqliteReader.assertLocationTableExists).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid source tags before hitting the database', async () => {
    await expect(
      runImportPreflight({
        sqliteFile: '/tmp/test.sqlite',
        sourceTag: 'bad source tag',
        pool,
        sqliteReader,
        existsSync: () => true,
      })
    ).rejects.toThrow('Source tag must be alphanumeric with underscores/hyphens only');

    expect(pool.query).not.toHaveBeenCalled();
  });

  it('wraps postgres connection errors', async () => {
    (pool.query as jest.Mock).mockRejectedValue(new Error('connection refused'));

    await expect(
      runImportPreflight({
        sqliteFile: '/tmp/test.sqlite',
        sourceTag: 'valid_source',
        pool,
        sqliteReader,
        existsSync: () => true,
      })
    ).rejects.toThrow('PostgreSQL connection failed: connection refused');
  });
});

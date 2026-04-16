import { clearPostgresEnv } from '../../../server/src/utils/envSanitizer';

describe('envSanitizer', () => {
  it('should delete PG environment variables', () => {
    process.env.PGHOST = 'localhost';
    process.env.PGPORT = '5432';
    process.env.PGDATABASE = 'db';
    process.env.PGUSER = 'user';

    clearPostgresEnv();

    expect(process.env.PGHOST).toBeUndefined();
    expect(process.env.PGPORT).toBeUndefined();
    expect(process.env.PGDATABASE).toBeUndefined();
    expect(process.env.PGUSER).toBeUndefined();
  });
});

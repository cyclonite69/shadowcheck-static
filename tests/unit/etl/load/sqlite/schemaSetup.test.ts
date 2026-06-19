import { Pool } from 'pg';
import {
  ensureDeviceSource,
  ensureNetworksOrphansTable,
} from '../../../../../etl/load/sqlite/schemaSetup';

describe('sqlite/schemaSetup', () => {
  let logSpy: jest.SpyInstance;
  let mockPool: Partial<Pool>;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockPool = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    };
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  describe('ensureDeviceSource', () => {
    it('runs the insert query with the specified source tag', async () => {
      await ensureDeviceSource(mockPool as Pool, 'test_source');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO app.device_sources'),
        ['test_source', 'WiGLE Import: test_source']
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("Device source 'test_source' ready")
      );
    });
  });

  describe('ensureNetworksOrphansTable', () => {
    it('runs the table creation, alter table, primary key setup, index creation, owner, and grants queries', async () => {
      await ensureNetworksOrphansTable(mockPool as Pool);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS app.networks_orphans')
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ALTER TABLE app.networks_orphans')
      );
      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('networks_orphans_pkey'));
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_networks_orphans_moved_at')
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('OWNER TO shadowcheck_admin')
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('GRANT SELECT ON app.networks_orphans TO shadowcheck_user')
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('GRANT ALL PRIVILEGES ON app.networks_orphans TO shadowcheck_admin')
      );
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Orphan holding table ready'));
    });
  });
});

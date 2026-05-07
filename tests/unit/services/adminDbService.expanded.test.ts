export {};

const mockPoolQuery = jest.fn();
const mockPoolOn = jest.fn();
const mockPoolEnd = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: mockPoolQuery,
    on: mockPoolOn,
    end: mockPoolEnd,
  })),
}));

jest.mock('../../../server/src/config/loadEnv', () => ({}));

jest.mock('../../../server/src/logging/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

const mockSecretsGet = jest.fn();
jest.mock('../../../server/src/services/secretsManager', () => ({
  get: mockSecretsGet,
  default: { get: mockSecretsGet },
}));

import { Pool } from 'pg';

// Each test uses isolateModules to get a fresh module with a clean pool singleton.
function loadFresh() {
  let mod: any;
  jest.isolateModules(() => {
    mod = require('../../../server/src/services/adminDbService');
  });
  return mod;
}

beforeEach(() => {
  jest.clearAllMocks();
  (Pool as unknown as jest.Mock).mockClear();
});

describe('adminDbService — getAdminPool', () => {
  test('creates pool when DB_ADMIN_PASSWORD env var is set', () => {
    process.env.DB_ADMIN_PASSWORD = 'test-admin-pass'; // gitleaks:allow
    process.env.DB_HOST = 'localhost';
    mockSecretsGet.mockReturnValue(null);

    const { getAdminPool } = loadFresh();
    const pool = getAdminPool();

    expect(pool).not.toBeNull();
    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'test-admin-pass' }) // gitleaks:allow
    );
    delete process.env.DB_ADMIN_PASSWORD;
  });

  test('uses secretsManager value when env var not set', () => {
    delete process.env.DB_ADMIN_PASSWORD;
    process.env.DB_HOST = 'localhost';
    mockSecretsGet.mockReturnValue('sm-admin-pass'); // gitleaks:allow

    const { getAdminPool } = loadFresh();
    const pool = getAdminPool();

    expect(pool).not.toBeNull();
    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'sm-admin-pass' }) // gitleaks:allow
    );
  });

  test('returns null and logs error when no password and not local compose', () => {
    delete process.env.DB_ADMIN_PASSWORD;
    process.env.DB_HOST = 'remote-host.example.com';
    mockSecretsGet.mockReturnValue(null);

    const logger = require('../../../server/src/logging/logger');
    const { getAdminPool } = loadFresh();
    const pool = getAdminPool();

    expect(pool).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('db_admin_password not available')
    );
    delete process.env.DB_HOST;
  });

  test('allows passwordless connection when host=postgres and no SSL', () => {
    delete process.env.DB_ADMIN_PASSWORD;
    process.env.DB_HOST = 'postgres';
    process.env.DB_SSL = 'false';
    mockSecretsGet.mockReturnValue(null);

    const logger = require('../../../server/src/logging/logger');
    const { getAdminPool } = loadFresh();
    const pool = getAdminPool();

    expect(pool).not.toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('passwordless local admin'));
    delete process.env.DB_HOST;
    delete process.env.DB_SSL;
  });

  test('returns cached pool on second call (no re-init)', () => {
    process.env.DB_ADMIN_PASSWORD = 'test-pass'; // gitleaks:allow
    mockSecretsGet.mockReturnValue(null);

    const { getAdminPool } = loadFresh();
    const pool1 = getAdminPool();
    const pool2 = getAdminPool();

    expect(pool1).toBe(pool2);
    expect(Pool).toHaveBeenCalledTimes(1);
    delete process.env.DB_ADMIN_PASSWORD;
  });
});

describe('adminDbService — adminQuery', () => {
  test('throws when pool is null (no password configured)', async () => {
    delete process.env.DB_ADMIN_PASSWORD;
    process.env.DB_HOST = 'remote-host.example.com';
    mockSecretsGet.mockReturnValue(null);

    const { adminQuery } = loadFresh();
    await expect(adminQuery('SELECT 1')).rejects.toThrow('Admin database pool not initialized');
    delete process.env.DB_HOST;
  });

  test('executes query when pool is available', async () => {
    process.env.DB_ADMIN_PASSWORD = 'test-pass'; // gitleaks:allow
    mockSecretsGet.mockReturnValue(null);
    mockPoolQuery.mockResolvedValue({ rows: [{ result: 1 }] });

    const { adminQuery } = loadFresh();
    const result = await adminQuery('SELECT 1', []);

    expect(mockPoolQuery).toHaveBeenCalledWith('SELECT 1', []);
    expect(result.rows).toEqual([{ result: 1 }]);
    delete process.env.DB_ADMIN_PASSWORD;
  });
});

describe('adminDbService — closeAdminPool', () => {
  test('calls pool.end() when pool exists', async () => {
    process.env.DB_ADMIN_PASSWORD = 'test-pass'; // gitleaks:allow
    mockSecretsGet.mockReturnValue(null);
    mockPoolEnd.mockResolvedValue(undefined);

    const { getAdminPool, closeAdminPool } = loadFresh();
    getAdminPool();
    await closeAdminPool();

    expect(mockPoolEnd).toHaveBeenCalled();
    delete process.env.DB_ADMIN_PASSWORD;
  });

  test('is a no-op when pool was never initialized', async () => {
    delete process.env.DB_ADMIN_PASSWORD;
    process.env.DB_HOST = 'remote-host.example.com';
    mockSecretsGet.mockReturnValue(null);

    const { closeAdminPool } = loadFresh();
    await expect(closeAdminPool()).resolves.toBeUndefined();
    expect(mockPoolEnd).not.toHaveBeenCalled();
    delete process.env.DB_HOST;
  });
});

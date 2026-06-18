describe('adminDbService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    jest.mock('../../../server/src/config/loadEnv', () => ({}));
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('adminQuery should execute a query', async () => {
    const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
    const mockOn = jest.fn();
    jest.mock('pg', () => ({
      Pool: jest.fn().mockImplementation(() => ({
        query: mockQuery,
        on: mockOn,
        end: jest.fn(),
      })),
    }));
    const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
    jest.mock('../../../server/src/services/secretsManager', () => ({
      default: { get: jest.fn().mockReturnValue('mock-password') },
      __esModule: true,
    }));
    jest.mock('../../../server/src/logging/logger', () => ({
      default: mockLogger,
      __esModule: true,
    }));

    process.env.DB_ADMIN_PASSWORD = 'env-password';
    process.env.DB_HOST = 'localhost';
    process.env.DB_SSL = 'false';

    const adminDbService = require('../../../server/src/services/adminDbService');
    const result = await adminDbService.adminQuery('SELECT 1', []);
    expect(mockQuery).toHaveBeenCalledWith('SELECT 1', []);
    expect(result.rows).toEqual([]);

    // Call the error handler captured by the 'on' method
    const errorHandler = mockOn.mock.calls.find((call) => call[0] === 'error')?.[1];
    if (errorHandler) {
      errorHandler(new Error('test error'));
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected error on admin pool idle client'),
        expect.any(Object)
      );
    }
  });

  it('closeAdminPool should close the pool', async () => {
    const mockEnd = jest.fn();
    jest.mock('pg', () => ({
      Pool: jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        end: mockEnd,
      })),
    }));
    jest.mock('../../../server/src/services/secretsManager', () => ({
      default: { get: jest.fn().mockReturnValue('mock-password') },
      __esModule: true,
    }));
    jest.mock('../../../server/src/logging/logger', () => ({
      default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
      __esModule: true,
    }));

    process.env.DB_ADMIN_PASSWORD = 'env-password';
    process.env.DB_HOST = 'localhost';
    process.env.DB_SSL = 'false';

    const adminDbService = require('../../../server/src/services/adminDbService');
    adminDbService.getAdminPool();
    adminDbService.getLongRunningAdminPool();

    await adminDbService.closeAdminPool();
    expect(mockEnd).toHaveBeenCalledTimes(2);
  });

  it('getAdminPool handles missing password and returns null', () => {
    jest.mock('pg', () => ({
      Pool: jest.fn(),
    }));
    jest.mock('../../../server/src/services/secretsManager', () => ({
      default: { get: jest.fn().mockReturnValue(null) },
      __esModule: true,
    }));
    const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
    jest.mock('../../../server/src/logging/logger', () => ({
      default: mockLogger,
      __esModule: true,
    }));

    delete process.env.DB_ADMIN_PASSWORD;
    process.env.DB_HOST = 'not-postgres'; // so passwordless fails

    const adminDbService = require('../../../server/src/services/adminDbService');
    const pool = adminDbService.getAdminPool();

    expect(pool).toBeNull();
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('db_admin_password not available')
    );
  });

  it('getLongRunningAdminPool handles missing password and returns null', () => {
    jest.mock('pg', () => ({
      Pool: jest.fn(),
    }));
    jest.mock('../../../server/src/services/secretsManager', () => ({
      default: { get: jest.fn().mockReturnValue(null) },
      __esModule: true,
    }));
    const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
    jest.mock('../../../server/src/logging/logger', () => ({
      default: mockLogger,
      __esModule: true,
    }));

    delete process.env.DB_ADMIN_PASSWORD;
    process.env.DB_HOST = 'not-postgres';

    const adminDbService = require('../../../server/src/services/adminDbService');
    const pool = adminDbService.getLongRunningAdminPool();

    expect(pool).toBeNull();
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('db_admin_password not available')
    );
  });

  it('forensicQuery handles read-only transaction', async () => {
    const mockQuery = jest.fn().mockResolvedValue({ rows: [{ id: 1 }] });
    const mockRelease = jest.fn();
    const mockConnect = jest.fn().mockResolvedValue({
      query: mockQuery,
      release: mockRelease,
    });

    jest.mock('pg', () => ({
      Pool: jest.fn().mockImplementation(() => ({
        connect: mockConnect,
        on: jest.fn(),
      })),
    }));
    jest.mock('../../../server/src/services/secretsManager', () => ({
      default: { get: jest.fn().mockReturnValue('mock-password') },
      __esModule: true,
    }));
    jest.mock('../../../server/src/logging/logger', () => ({
      default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
      __esModule: true,
    }));

    process.env.DB_ADMIN_PASSWORD = 'env-password';

    const adminDbService = require('../../../server/src/services/adminDbService');
    const result = await adminDbService.forensicQuery('SELECT 1', []);

    expect(mockQuery).toHaveBeenCalledWith('BEGIN');
    expect(mockQuery).toHaveBeenCalledWith('SET TRANSACTION READ ONLY');
    expect(mockQuery).toHaveBeenCalledWith('SELECT 1', []);
    expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(mockRelease).toHaveBeenCalled();
    expect(result.rows).toEqual([{ id: 1 }]);
  });

  it('longRunningAdminQuery executes a query', async () => {
    const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
    const mockOn = jest.fn();
    jest.mock('pg', () => ({
      Pool: jest.fn().mockImplementation(() => ({
        query: mockQuery,
        on: mockOn,
      })),
    }));
    const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
    jest.mock('../../../server/src/services/secretsManager', () => ({
      default: { get: jest.fn().mockReturnValue('mock-password') },
      __esModule: true,
    }));
    jest.mock('../../../server/src/logging/logger', () => ({
      default: mockLogger,
      __esModule: true,
    }));

    process.env.DB_ADMIN_PASSWORD = 'env-password';

    const adminDbService = require('../../../server/src/services/adminDbService');
    await adminDbService.longRunningAdminQuery('SELECT 1', []);
    expect(mockQuery).toHaveBeenCalledWith('SELECT 1', []);

    // Call the error handler captured by the 'on' method
    const errorHandler = mockOn.mock.calls.find((call) => call[0] === 'error')?.[1];
    if (errorHandler) {
      errorHandler(new Error('test long error'));
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected error on long-running admin pool idle client'),
        expect.any(Object)
      );
    }
  });
});

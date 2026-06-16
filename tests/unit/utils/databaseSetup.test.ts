import { initializeDatabaseConnection } from '../../../server/src/utils/databaseSetup';

// Mock dependencies
jest.mock('../../../server/src/config/database', () => ({
  pool: {},
  query: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../server/src/core/initialization/databaseInit', () => ({
  initializeDatabase: jest.fn().mockResolvedValue(undefined),
}));

describe('databaseSetup', () => {
  it('should initialize database and return connection', async () => {
    const mockLogger: any = { info: jest.fn() };

    const result = await initializeDatabaseConnection(mockLogger);

    const { initializeDatabase } = require('../../../server/src/core/initialization/databaseInit');

    expect(initializeDatabase).toHaveBeenCalled();
    expect(result.pool).toBeDefined();
    expect(result.query).toBeDefined();
  });

  it('passes logger through to initialize call', async () => {
    const mockLogger: any = { info: jest.fn(), warn: jest.fn() };

    await initializeDatabaseConnection(mockLogger);

    const { initializeDatabase } = require('../../../server/src/core/initialization/databaseInit');
    // Logger is passed as part of options object with pool and testConnection
    expect(initializeDatabase).toHaveBeenCalled();
    const call = initializeDatabase.mock.calls[0];
    expect(call[0]).toHaveProperty('logger');
    expect(call[0].logger).toBe(mockLogger);
  });
});

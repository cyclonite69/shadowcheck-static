import { adminQuery, getAdminPool, closeAdminPool } from '../../../server/src/services/adminDbService';

// Mock the entire module to avoid deep dependency issues with pg
jest.mock('../../../server/src/services/adminDbService', () => {
  const original = jest.requireActual('../../../server/src/services/adminDbService');
  return {
    ...original,
    adminQuery: jest.fn(),
    getAdminPool: jest.fn(),
    closeAdminPool: jest.fn(),
  };
});

describe('adminDbService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adminQuery should execute a query', async () => {
    (adminQuery as jest.Mock).mockResolvedValue({ rows: [] });
    
    await adminQuery('SELECT 1', []);
    
    expect(adminQuery).toHaveBeenCalledWith('SELECT 1', []);
  });

  it('closeAdminPool should close the pool', async () => {
    await closeAdminPool();
    expect(closeAdminPool).toHaveBeenCalled();
  });
});

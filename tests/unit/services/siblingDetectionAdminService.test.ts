export {};

const mockAdminQuery = jest.fn();

jest.mock('../../../server/src/services/adminDbService', () => ({
  adminQuery: mockAdminQuery,
}));

jest.mock('../../../server/src/logging/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const {
  purgeSiblingPairs,
} = require('../../../server/src/services/admin/siblingDetectionAdminService');

beforeEach(() => jest.clearAllMocks());

// ── purgeSiblingPairs ─────────────────────────────────────────────────────────

describe('purgeSiblingPairs', () => {
  test('issues TRUNCATE on network_sibling_pairs', async () => {
    mockAdminQuery.mockResolvedValue({ rowCount: 0 });
    await purgeSiblingPairs();
    expect(mockAdminQuery).toHaveBeenCalledWith(
      'TRUNCATE app.network_sibling_pairs',
      expect.anything()
    );
  });

  test('returns { deleted: rowCount } from query result', async () => {
    mockAdminQuery.mockResolvedValue({ rowCount: 81552 });
    const result = await purgeSiblingPairs();
    expect(result).toEqual({ deleted: 81552 });
  });

  test('returns { deleted: 0 } when rowCount is null', async () => {
    mockAdminQuery.mockResolvedValue({ rowCount: null });
    const result = await purgeSiblingPairs();
    expect(result).toEqual({ deleted: 0 });
  });

  test('propagates adminQuery errors', async () => {
    mockAdminQuery.mockRejectedValue(new Error('DB error'));
    await expect(purgeSiblingPairs()).rejects.toThrow('DB error');
  });
});

import { purgeSiblingPairs } from '../../../../../../server/src/services/admin/siblingDetection/use-cases/purgeSiblingPairs';
import { adminQuery } from '../../../../../../server/src/services/admin/siblingDetection/adminQueryAdapter';
import logger from '../../../../../../server/src/logging/logger';

jest.mock('../../../../../../server/src/services/admin/siblingDetection/adminQueryAdapter', () => ({
  adminQuery: jest.fn(),
}));

jest.mock('../../../../../../server/src/logging/logger', () => ({
  info: jest.fn(),
}));

describe('purgeSiblingPairs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('truncates the table and returns rowCount', async () => {
    (adminQuery as jest.Mock).mockResolvedValue({ rowCount: 100 });

    const result = await purgeSiblingPairs();

    expect(result).toEqual({ deleted: 100 });
    expect(adminQuery).toHaveBeenCalledWith('TRUNCATE app.network_sibling_pairs');
    expect(logger.info).toHaveBeenCalled();
  });

  it('defaults to 0 if rowCount is null', async () => {
    (adminQuery as jest.Mock).mockResolvedValue({ rowCount: null });

    const result = await purgeSiblingPairs();

    expect(result.deleted).toBe(0);
  });
});

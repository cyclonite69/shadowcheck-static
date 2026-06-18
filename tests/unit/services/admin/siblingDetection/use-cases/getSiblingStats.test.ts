import { getSiblingStats } from '../../../../../../server/src/services/admin/siblingDetection/use-cases/getSiblingStats';
import { adminQuery } from '../../../../../../server/src/services/admin/siblingDetection/adminQueryAdapter';

jest.mock('../../../../../../server/src/services/admin/siblingDetection/adminQueryAdapter', () => ({
  adminQuery: jest.fn(),
}));

describe('getSiblingStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns first row from adminQuery', async () => {
    const mockRow = { total_pairs: 100, strong_pairs: 50 };
    (adminQuery as jest.Mock).mockResolvedValue({ rows: [mockRow] });

    const result = await getSiblingStats();

    expect(result).toEqual(mockRow);
    expect(adminQuery).toHaveBeenCalled();
  });

  it('returns empty object if no rows found', async () => {
    (adminQuery as jest.Mock).mockResolvedValue({ rows: [] });

    const result = await getSiblingStats();

    expect(result).toEqual({});
  });
});

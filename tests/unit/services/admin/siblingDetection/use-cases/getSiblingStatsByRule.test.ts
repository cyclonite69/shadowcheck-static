import { getSiblingStatsByRule } from '../../../../../../server/src/services/admin/siblingDetection/use-cases/getSiblingStatsByRule';
import { adminQuery } from '../../../../../../server/src/services/admin/siblingDetection/adminQueryAdapter';

jest.mock('../../../../../../server/src/services/admin/siblingDetection/adminQueryAdapter', () => ({
  adminQuery: jest.fn(),
}));

describe('getSiblingStatsByRule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns rows from adminQuery', async () => {
    const mockRows = [
      { rule: 'rule1', count: 10 },
      { rule: 'rule2', count: 20 },
    ];
    (adminQuery as jest.Mock).mockResolvedValue({ rows: mockRows });

    const result = await getSiblingStatsByRule();

    expect(result).toEqual(mockRows);
    expect(adminQuery).toHaveBeenCalled();
  });

  it('handles empty results', async () => {
    (adminQuery as jest.Mock).mockResolvedValue({ rows: [] });

    const result = await getSiblingStatsByRule();

    expect(result).toEqual([]);
  });
});

import { SiblingRunRepository } from '../../../server/src/repositories/siblingRunRepository';

const mockAdminQuery = jest.fn();

jest.mock('../../../server/src/config/container', () => ({
  adminDbService: {
    adminQuery: (...args: any[]) => mockAdminQuery(...args),
  },
}));

describe('SiblingRunRepository', () => {
  let repository: SiblingRunRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new SiblingRunRepository();
  });

  it('createRun should insert a new sibling detection run', async () => {
    mockAdminQuery.mockResolvedValueOnce({ rows: [{ id: 123 }] });
    const runId = await repository.createRun('full', {
      maxOctetDelta: 1,
      minCandidateConf: 0.85,
      batchSize: 100,
      maxBatches: null,
    });
    expect(runId).toBe(123);
    expect(mockAdminQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO app.sibling_runs'),
      ['full', 1, 0.85, 100, null]
    );
  });

  it('completeRun should update run with five parameters including rowsUpdated', async () => {
    mockAdminQuery.mockResolvedValueOnce({});
    await repository.completeRun(123, 'completed', {
      seedsProcessed: 10,
      rowsUpserted: 20,
      rowsUpdated: 5,
    });
    expect(mockAdminQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE app.sibling_runs'),
      ['completed', 10, 20, 5, 123]
    );
  });

  it('getPreviousRunCutoff should return newest computed_at timestamp', async () => {
    mockAdminQuery.mockResolvedValueOnce({ rows: [{ cutoff: '2026-05-28T12:00:00Z' }] });
    const cutoff = await repository.getPreviousRunCutoff();
    expect(cutoff).toBe('2026-05-28T12:00:00Z');
    expect(mockAdminQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT MAX(computed_at)'),
      []
    );
  });
});

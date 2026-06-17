import { cancelSiblingRefresh } from '../../../../../../server/src/services/admin/siblingDetection/use-cases/cancelSiblingRefresh';
import { state } from '../../../../../../server/src/services/admin/siblingDetectionState';
import { adminQuery } from '../../../../../../server/src/services/admin/siblingDetection/adminQueryAdapter';
import { reconcileSiblingState } from '../../../../../../server/src/services/admin/siblingDetection/use-cases/reconcileSiblingState';

jest.mock('../../../../../../server/src/services/admin/siblingDetectionState', () => ({
  state: {
    running: false,
    cancelRequested: false,
  },
}));

jest.mock('../../../../../../server/src/services/admin/siblingDetection/adminQueryAdapter', () => ({
  adminQuery: jest.fn(),
}));

jest.mock(
  '../../../../../../server/src/services/admin/siblingDetection/use-cases/reconcileSiblingState',
  () => ({
    reconcileSiblingState: jest.fn(),
  })
);

describe('cancelSiblingRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    state.running = false;
    state.cancelRequested = false;
    (adminQuery as jest.Mock).mockResolvedValue({ rowCount: 0 });
    (reconcileSiblingState as jest.Mock).mockResolvedValue(undefined);
  });

  it('returns false if nothing is running', async () => {
    const result = await cancelSiblingRefresh();

    expect(result.accepted).toBe(false);
    expect(result.message).toBe('No job is currently running');
    expect(state.cancelRequested).toBe(false);
    expect(reconcileSiblingState).toHaveBeenCalled();
  });

  it('cancels in-memory job if state.running is true', async () => {
    state.running = true;

    const result = await cancelSiblingRefresh();

    expect(result.accepted).toBe(true);
    expect(result.message).toContain('in-memory job cancelled');
    expect(state.cancelRequested).toBe(true);
  });

  it('updates database runs if they are in running status', async () => {
    (adminQuery as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1 }) // bgJobResult
      .mockResolvedValueOnce({ rowCount: 1 }); // siblingResult

    const result = await cancelSiblingRefresh();

    expect(result.accepted).toBe(true);
    expect(result.message).toContain('background_job_runs updated (1 row)');
    expect(result.message).toContain('sibling_runs updated (1 row)');
  });

  it('handles only background job run update', async () => {
    (adminQuery as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 5 }) // 5 rows in bgJobResult
      .mockResolvedValueOnce({ rowCount: 0 });

    const result = await cancelSiblingRefresh();

    // With 1 dbUpdate and state.running=false, it returns accepted: false (per source logic)
    // Wait, let's re-read source: if (state.running || dbUpdates.length > 1)
    expect(result.accepted).toBe(false);
  });

  it('returns true if state.running is false but multiple DB tables were updated', async () => {
    (adminQuery as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1 });

    const result = await cancelSiblingRefresh();

    expect(result.accepted).toBe(true);
    expect(result.message).toContain('Job cancelled');
  });
});

import { getSiblingRefreshStatusReconciled } from '../../../../../../server/src/services/admin/siblingDetection/use-cases/getSiblingRefreshStatusReconciled';
import {
  getSiblingRefreshStatus,
  state,
} from '../../../../../../server/src/services/admin/siblingDetectionState';
import { adminQuery } from '../../../../../../server/src/services/admin/siblingDetection/adminQueryAdapter';
import { reconcileSiblingState } from '../../../../../../server/src/services/admin/siblingDetection/use-cases/reconcileSiblingState';
import logger from '../../../../../../server/src/logging/logger';

jest.mock('../../../../../../server/src/services/admin/siblingDetectionState', () => ({
  state: {
    running: false,
  },
  getSiblingRefreshStatus: jest.fn(),
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

jest.mock('../../../../../../server/src/logging/logger', () => ({
  info: jest.fn(),
}));

describe('getSiblingRefreshStatusReconciled', () => {
  const mockStatus = { running: false, progress: 0 };

  beforeEach(() => {
    jest.clearAllMocks();
    state.running = false;
    (getSiblingRefreshStatus as jest.Mock).mockReturnValue(mockStatus);
    (reconcileSiblingState as jest.Mock).mockResolvedValue(undefined);
    (adminQuery as jest.Mock).mockResolvedValue({ rows: [] });
  });

  it('reconciles and returns status immediately if already running', async () => {
    state.running = true;
    const result = await getSiblingRefreshStatusReconciled();

    expect(result).toEqual(mockStatus);
    expect(reconcileSiblingState).toHaveBeenCalled();
    expect(adminQuery).not.toHaveBeenCalled();
  });

  it('checks for stale rows if not running', async () => {
    (adminQuery as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // background_job_runs
      .mockResolvedValueOnce({ rows: [] }); // sibling_runs

    const result = await getSiblingRefreshStatusReconciled();

    expect(result).toEqual(mockStatus);
    expect(adminQuery).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('auto-fixed'));
  });

  it('handles stale rows in sibling_runs only', async () => {
    (adminQuery as jest.Mock)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 2 }] });

    await getSiblingRefreshStatusReconciled();

    expect(logger.info).toHaveBeenCalled();
  });

  it('simply returns status if no stale rows found', async () => {
    await getSiblingRefreshStatusReconciled();
    expect(logger.info).not.toHaveBeenCalled();
  });
});

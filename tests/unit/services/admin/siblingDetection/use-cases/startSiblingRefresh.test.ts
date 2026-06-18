import { startSiblingRefresh } from '../../../../../../server/src/services/admin/siblingDetection/use-cases/startSiblingRefresh';
import {
  state,
  getSiblingRefreshStatus,
} from '../../../../../../server/src/services/admin/siblingDetectionState';
import { adminQuery } from '../../../../../../server/src/services/admin/siblingDetection/adminQueryAdapter';
import { runSiblingRefreshJob } from '../../../../../../server/src/services/admin/siblingDetection/use-cases/runSiblingRefreshJob';
import logger from '../../../../../../server/src/logging/logger';

jest.mock('../../../../../../server/src/services/admin/siblingDetection/adminQueryAdapter', () => ({
  adminQuery: jest.fn(),
}));

jest.mock(
  '../../../../../../server/src/services/admin/siblingDetection/use-cases/runSiblingRefreshJob',
  () => ({
    runSiblingRefreshJob: jest.fn(),
  })
);

jest.mock('../../../../../../server/src/logging/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe('startSiblingRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    state.running = false;
    state.cancelRequested = false;
    state.startedAt = null;
    state.finishedAt = null;
    state.lastError = null;
    state.lastResult = null;
    state.options = {} as any;
    state.progress = {} as any;
    (adminQuery as jest.Mock).mockResolvedValue({ rowCount: 1, rows: [{ id: 999 }] });
  });

  it('should return accepted false if already running', async () => {
    state.running = true;
    const result = await startSiblingRefresh();
    expect(result.accepted).toBe(false);
    expect(result.status.running).toBe(true);
    expect(runSiblingRefreshJob).not.toHaveBeenCalled();
  });

  it('should start the job and return accepted true', async () => {
    let jobResolver: Function = () => {};
    const jobPromise = new Promise((resolve) => {
      jobResolver = resolve;
    });
    (runSiblingRefreshJob as jest.Mock).mockReturnValue(jobPromise);

    const result = await startSiblingRefresh({ maxBatches: 5 });

    expect(result.accepted).toBe(true);
    expect(result.status.running).toBe(true);
    expect(state.running).toBe(true);
    expect(state.startedAt).toBeTruthy();
    expect(state.options?.maxBatches).toBe(5);
    expect(adminQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO app.background_job_runs'),
      expect.arrayContaining(['siblingDetection', 'running', null])
    );
    expect(runSiblingRefreshJob).toHaveBeenCalledWith(state.options);

    // Resolve the job
    jobResolver({
      rowsUpserted: 10,
      seedsProcessed: 5,
      sibling_run_id: 123,
    });
    // Wait for macro-task queue
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(state.lastResult).toEqual({
      rowsUpserted: 10,
      seedsProcessed: 5,
      sibling_run_id: 123,
    });
    expect(state.running).toBe(false);
    expect(state.finishedAt).toBeTruthy();
    expect(adminQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE app.background_job_runs'),
      expect.arrayContaining(['completed', 'siblingDetection', 'running', 10, 5, 'test', 123])
    );
  });

  it('should handle background job creation failure gracefully', async () => {
    (adminQuery as jest.Mock).mockRejectedValueOnce(new Error('DB error on insert'));
    (runSiblingRefreshJob as jest.Mock).mockResolvedValue({
      rowsUpserted: 0,
      seedsProcessed: 0,
      sibling_run_id: null,
    });

    const result = await startSiblingRefresh({ incremental: true });
    expect(result.accepted).toBe(true);
    expect(logger.error).toHaveBeenCalledWith(
      '[Siblings] Failed to create background job run record',
      expect.objectContaining({ error: 'DB error on insert' })
    );

    // Wait for macro-task queue
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(state.running).toBe(false);
  });

  it('should handle background job completion update failure gracefully', async () => {
    (runSiblingRefreshJob as jest.Mock).mockResolvedValue({
      rowsUpserted: 0,
      seedsProcessed: 0,
      sibling_run_id: null,
    });
    (adminQuery as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1 }) // insert
      .mockRejectedValueOnce(new Error('DB error on update')); // update

    await startSiblingRefresh();

    // Wait for macro-task queue
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(logger.error).toHaveBeenCalledWith(
      '[Siblings] Failed to update background job run to completed',
      expect.objectContaining({ error: 'DB error on update' })
    );
  });

  it('should handle job failure and update state and DB correctly', async () => {
    let jobRejector: Function = () => {};
    const jobPromise = new Promise((_, reject) => {
      jobRejector = reject;
    });
    (runSiblingRefreshJob as jest.Mock).mockReturnValue(jobPromise);

    await startSiblingRefresh();

    // Reject the job
    jobRejector(new Error('Job failed internally'));
    // Wait for macro-task queue
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(state.lastError).toBe('Job failed internally');
    expect(state.running).toBe(false);
    expect(adminQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id FROM app.sibling_runs')
    );
    expect(adminQuery).toHaveBeenCalledWith(
      expect.stringContaining('error = $2'),
      expect.arrayContaining(['failed', 'Job failed internally', 'siblingDetection', 'full', 999])
    );
  });

  it('should handle job failure and failure to query sibling_runs', async () => {
    (runSiblingRefreshJob as jest.Mock).mockRejectedValue(new Error('Job failed'));
    (adminQuery as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1 }) // insert
      .mockRejectedValueOnce(new Error('DB query error')); // select sibling_runs

    await startSiblingRefresh();

    // Wait for macro-task queue
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(logger.error).toHaveBeenCalledWith(
      '[Siblings] Failed to query sibling_runs for failed job',
      expect.objectContaining({ error: 'DB query error' })
    );
  });

  it('should handle job failure and failure to update background_job_runs', async () => {
    (runSiblingRefreshJob as jest.Mock).mockRejectedValue(new Error('Job failed'));
    (adminQuery as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1 }) // insert
      .mockResolvedValueOnce({ rows: [{ id: 888 }] }) // select sibling_runs
      .mockRejectedValueOnce(new Error('DB update error')); // update background_job_runs

    await startSiblingRefresh();

    // Wait for macro-task queue
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(logger.error).toHaveBeenCalledWith(
      '[Siblings] Failed to update background job run to failed',
      expect.objectContaining({ error: 'DB update error' })
    );
  });
});

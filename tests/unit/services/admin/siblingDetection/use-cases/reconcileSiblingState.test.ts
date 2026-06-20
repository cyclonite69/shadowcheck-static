import { reconcileSiblingState } from '../../../../../../server/src/services/admin/siblingDetection/use-cases/reconcileSiblingState';
import { state } from '../../../../../../server/src/services/admin/siblingDetectionState';
import { adminQuery } from '../../../../../../server/src/services/admin/siblingDetection/adminQueryAdapter';
import logger from '../../../../../../server/src/logging/logger';

jest.mock('../../../../../../server/src/services/admin/siblingDetectionState', () => ({
  state: {
    running: false,
  },
}));

jest.mock('../../../../../../server/src/services/admin/siblingDetection/adminQueryAdapter', () => ({
  adminQuery: jest.fn(),
}));

jest.mock('../../../../../../server/src/logging/logger', () => ({
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
}));

describe('reconcileSiblingState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    state.running = false;
    (adminQuery as jest.Mock).mockResolvedValue({ rows: [] });
  });

  it('does nothing if state.running is true', async () => {
    state.running = true;
    await reconcileSiblingState();
    expect(adminQuery).not.toHaveBeenCalled();
  });

  it('reconciles stale rows in both background_job_runs and sibling_runs', async () => {
    state.running = false;
    (adminQuery as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 101 }] }) // SELECT bg
      .mockResolvedValueOnce({}) // UPDATE bg
      .mockResolvedValueOnce({ rows: [{ id: 202 }] }) // SELECT sibling
      .mockResolvedValueOnce({}); // UPDATE sibling

    await reconcileSiblingState();

    expect(adminQuery).toHaveBeenCalledTimes(4);
    expect(logger.warn).toHaveBeenCalledTimes(2);

    // Call 0: SELECT background_job_runs
    const [selectBgSql, selectBgParams] = (adminQuery as jest.Mock).mock.calls[0];
    expect(selectBgSql).toContain('SELECT id FROM app.background_job_runs');
    expect(selectBgSql).toContain('WHERE job_name = $1 AND status = $2');
    expect(selectBgSql).toContain('ORDER BY id DESC LIMIT 1');
    expect(selectBgParams).toEqual(['siblingDetection', 'running']);

    // Call 1: UPDATE background_job_runs
    const [updateBgSql, updateBgParams] = (adminQuery as jest.Mock).mock.calls[1];
    expect(updateBgSql).toContain('UPDATE app.background_job_runs');
    expect(updateBgSql).toContain('SET status = $1');
    expect(updateBgSql).toContain('finished_at = now()');
    expect(updateBgSql).toContain('error = $2');
    expect(updateBgSql).toContain('WHERE job_name = $3 AND status = $4');
    expect(updateBgParams).toEqual([
      'failed',
      'Interrupted by container restart',
      'siblingDetection',
      'running',
    ]);

    // Call 2: SELECT sibling_runs
    const [selectSibSql, selectSibParams] = (adminQuery as jest.Mock).mock.calls[2];
    expect(selectSibSql).toContain('SELECT id FROM app.sibling_runs');
    expect(selectSibSql).toContain('WHERE status = $1');
    expect(selectSibSql).toContain('ORDER BY id DESC LIMIT 1');
    expect(selectSibParams).toEqual(['running']);

    // Call 3: UPDATE sibling_runs
    const [updateSibSql, updateSibParams] = (adminQuery as jest.Mock).mock.calls[3];
    expect(updateSibSql).toContain('UPDATE app.sibling_runs');
    expect(updateSibSql).toContain('SET status = $1');
    expect(updateSibSql).toContain('completed_at = now()');
    expect(updateSibSql).toContain('WHERE status = $2');
    expect(updateSibParams).toEqual(['failed', 'running']);
  });

  it('reconciles only background_job_runs if sibling_runs has no stale rows', async () => {
    state.running = false;
    (adminQuery as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 101 }] }) // SELECT bg
      .mockResolvedValueOnce({}) // UPDATE bg
      .mockResolvedValueOnce({ rows: [] }); // SELECT sibling (empty)

    await reconcileSiblingState();

    expect(adminQuery).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('reconciles only sibling_runs if background_job_runs has no stale rows', async () => {
    state.running = false;
    (adminQuery as jest.Mock)
      .mockResolvedValueOnce({ rows: [] }) // SELECT bg (empty)
      .mockResolvedValueOnce({ rows: [{ id: 202 }] }) // SELECT sibling
      .mockResolvedValueOnce({}); // UPDATE sibling

    await reconcileSiblingState();

    expect(adminQuery).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('does nothing if no stale rows are found in either table', async () => {
    state.running = false;
    (adminQuery as jest.Mock)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await reconcileSiblingState();

    expect(adminQuery).toHaveBeenCalledTimes(2);
    expect(logger.warn).not.toHaveBeenCalled();
  });
});

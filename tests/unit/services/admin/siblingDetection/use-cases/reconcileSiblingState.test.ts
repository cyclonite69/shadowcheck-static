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
    expect(adminQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE app.background_job_runs'),
      expect.any(Array)
    );
    expect(adminQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE app.sibling_runs'),
      expect.any(Array)
    );
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

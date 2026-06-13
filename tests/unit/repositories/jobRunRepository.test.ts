export {};

const mockLogger = {
  error: jest.fn(),
};
const mockResolveJobConfig = jest.fn();
const mockLoadBackgroundJobConfigs = jest.fn();
const mockGetResolvedJobConfig = jest.fn();

jest.mock('../../../server/src/logging/logger', () => mockLogger);

jest.mock('../../../server/src/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../../../server/src/services/backgroundJobs/config', () => ({
  JOB_SETTING_NAMES: ['backup', 'mlScoring'],
  resolveJobConfig: mockResolveJobConfig,
}));

jest.mock('../../../server/src/services/backgroundJobs/settings', () => ({
  loadBackgroundJobConfigs: mockLoadBackgroundJobConfigs,
  getResolvedJobConfig: mockGetResolvedJobConfig,
}));

const { query } = require('../../../server/src/config/database');
const jobRunRepository = require('../../../server/src/repositories/jobRunRepository');

describe('jobRunRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveJobConfig.mockReturnValue({ cron: '*/5 * * * *' });
    mockLoadBackgroundJobConfigs.mockResolvedValue({ backup: { enabled: true } });
    mockGetResolvedJobConfig.mockImplementation((_configs, jobName) => ({
      enabled: true,
      cron: jobName === 'backup' ? '0 1 * * *' : '0 2 * * *',
    }));
  });

  it('creates a running job and returns a numeric id', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: '123' }] });

    await expect(jobRunRepository.createJobRun('backup', '* * * * *')).resolves.toBe(123);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("VALUES ($1, $2, 'running')"), [
      'backup',
      '* * * * *',
    ]);
  });

  it('completes a job with JSON details and duration', async () => {
    query.mockResolvedValueOnce({});

    await jobRunRepository.completeJobRun(123, { success: true }, 100);

    expect(query).toHaveBeenCalledWith(expect.stringContaining("status = 'completed'"), [
      123,
      '{"success":true}',
      100,
    ]);
  });

  it('uses empty JSON details when completion metadata is absent', async () => {
    query.mockResolvedValueOnce({});

    await jobRunRepository.completeJobRun(123, null as any, 100);

    expect(query).toHaveBeenCalledWith(expect.any(String), [123, '{}', 100]);
  });

  it('marks a job failed with its error and duration', async () => {
    query.mockResolvedValueOnce({});

    await jobRunRepository.failJobRun(123, 'error', 100);

    expect(query).toHaveBeenCalledWith(expect.stringContaining("status = 'failed'"), [
      123,
      'error',
      100,
    ]);
  });

  it('tracks successful task execution and clears the running id', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1125);
    query.mockResolvedValueOnce({ rows: [{ id: '7' }] }).mockResolvedValueOnce({});
    const task = jest.fn().mockResolvedValue(undefined);
    const runningJobIds: Record<string, number> = {};

    await jobRunRepository.trackJobRun('backup', task, {
      lastConfig: {},
      runningJobIds,
    });

    expect(mockResolveJobConfig).toHaveBeenCalledWith({}, 'backup');
    expect(task).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining("status = 'completed'"), [
      7,
      '{}',
      125,
    ]);
    expect(runningJobIds).toEqual({});
    now.mockRestore();
  });

  it('records thrown values as failed runs and logs the message', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValueOnce(2000).mockReturnValueOnce(2050);
    query.mockResolvedValueOnce({ rows: [{ id: 8 }] }).mockResolvedValueOnce({});
    const runningJobIds: Record<string, number> = {};

    await jobRunRepository.trackJobRun('mlScoring', jest.fn().mockRejectedValue('task failed'), {
      lastConfig: {},
      runningJobIds,
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      '[Background Jobs] mlScoring failed: task failed'
    );
    expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining("status = 'failed'"), [
      8,
      'task failed',
      50,
    ]);
    expect(runningJobIds).toEqual({});
    now.mockRestore();
  });

  it('combines recent DB runs with resolved schedules and next invocations', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: '11',
          job_name: 'backup',
          status: 'running',
          cron: '0 1 * * *',
          started_at: '2026-06-13T01:00:00Z',
          finished_at: null,
          duration_ms: null,
          error: '',
          details: null,
        },
        {
          id: '10',
          job_name: 'backup',
          status: 'completed',
          cron: '0 1 * * *',
          started_at: '2026-06-12T01:00:00Z',
          finished_at: '2026-06-12T01:00:05Z',
          duration_ms: '5000',
          error: null,
          details: { files: 1 },
        },
        {
          id: '99',
          job_name: 'unknown-job',
          status: 'failed',
        },
      ],
    });
    const jobs = {
      backup: {
        nextInvocation: jest.fn(() => new Date('2026-06-14T01:00:00Z')),
      },
    };

    const result = await jobRunRepository.getJobStatus(jobs);

    expect(mockLoadBackgroundJobConfigs).toHaveBeenCalledTimes(1);
    expect(result.jobs.backup).toEqual(
      expect.objectContaining({
        config: { enabled: true, cron: '0 1 * * *' },
        nextRun: '2026-06-14T01:00:00.000Z',
        currentRun: expect.objectContaining({ id: 11, status: 'running', details: {} }),
        lastRun: expect.objectContaining({
          id: 10,
          status: 'completed',
          durationMs: 5000,
          details: { files: 1 },
        }),
      })
    );
    expect(result.jobs.mlScoring).toEqual(
      expect.objectContaining({
        config: { enabled: true, cron: '0 2 * * *' },
        nextRun: null,
        recentRuns: [],
        currentRun: null,
        lastRun: null,
      })
    );
  });
});

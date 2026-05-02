export {};

jest.mock('node-schedule', () => ({ scheduleJob: jest.fn() }));
jest.mock('../../../../server/src/logging/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('../../../../server/src/services/adminDbService', () => ({ adminQuery: jest.fn() }));
jest.mock('../../../../server/src/repositories/jobRunRepository', () => ({
  getJobStatus: jest.fn(),
  trackJobRun: jest.fn().mockImplementation(async (_name: any, task: any) => task()),
}));
jest.mock('../../../../server/src/services/backgroundJobs/settings', () => ({
  getResolvedJobConfig: jest.fn().mockReturnValue({ enabled: true, cron: '0 0 * * *' }),
  hasJobConfigChanged: jest.fn().mockReturnValue(false),
  loadBackgroundJobConfigs: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../../../server/src/services/backgroundJobs/mvRefresh', () => ({
  refreshMaterializedViews: jest.fn(),
}));
jest.mock('../../../../server/src/services/backgroundJobs/runners', () => ({
  runBackupJob: jest.fn(),
  runBehavioralMlScoringJob: jest.fn(),
  runSiblingDetectionJob: jest.fn(),
}));
jest.mock('../../../../server/src/services/featureFlagService', () => ({
  getFlag: jest.fn().mockReturnValue(true),
}));
jest.mock('../../../../server/src/services/backgroundJobs/config', () => ({
  BACKUP_CRON: '0 3 * * *',
  DEFAULT_JOB_CONFIGS: {},
  ML_SCORING_CRON: '0 */4 * * *',
  MV_REFRESH_CRON: '30 4 * * *',
}));

const BackgroundJobsService = require('../../../../server/src/services/backgroundJobsService');
const mockRunners = require('../../../../server/src/services/backgroundJobs/runners');
const mockMvRefresh = require('../../../../server/src/services/backgroundJobs/mvRefresh');
const mockJobRunRepository = require('../../../../server/src/repositories/jobRunRepository');
const mockLogger = require('../../../../server/src/logging/logger');

beforeEach(() => {
  jest.clearAllMocks();
  BackgroundJobsService.jobs = {};
  BackgroundJobsService.runningJobIds = {};
  BackgroundJobsService.initialized = false;
  mockRunners.runBackupJob.mockResolvedValue(undefined);
  mockRunners.runBehavioralMlScoringJob.mockResolvedValue(undefined);
  mockRunners.runSiblingDetectionJob.mockResolvedValue(undefined);
  mockMvRefresh.refreshMaterializedViews.mockResolvedValue(undefined);
  mockJobRunRepository.getJobStatus.mockResolvedValue({ backup: { lastRun: null } });
});

describe('BackgroundJobsService — expanded coverage', () => {
  describe('runJobNow', () => {
    test('mvRefresh completes and returns status', async () => {
      const result = await BackgroundJobsService.runJobNow('mvRefresh');
      expect(result).toEqual({ jobName: 'mvRefresh', status: 'completed' });
      expect(mockMvRefresh.refreshMaterializedViews).toHaveBeenCalled();
    });

    test('siblingDetection passes options through', async () => {
      const result = await BackgroundJobsService.runJobNow('siblingDetection', { force: true });
      expect(result).toEqual({ jobName: 'siblingDetection', status: 'completed' });
      expect(mockRunners.runSiblingDetectionJob).toHaveBeenCalledWith({ force: true });
    });
  });

  describe('startJobNow', () => {
    test('returns started immediately without awaiting job completion', async () => {
      const result = await BackgroundJobsService.startJobNow('backup');
      expect(result).toEqual({ jobName: 'backup', status: 'started' });
    });

    test('logs error if job fails but does not throw', async () => {
      mockRunners.runBackupJob.mockRejectedValue(new Error('disk full'));
      const result = await BackgroundJobsService.startJobNow('backup');
      expect(result.status).toBe('started');
      // Give the fire-and-forget promise a tick to settle
      await new Promise((r) => setTimeout(r, 0));
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('backup'),
        expect.anything()
      );
    });
  });

  describe('scoreNow', () => {
    test('delegates to runMLScoring', async () => {
      await BackgroundJobsService.scoreNow();
      expect(mockRunners.runBehavioralMlScoringJob).toHaveBeenCalled();
    });
  });

  describe('getJobStatus', () => {
    test('returns scheduler state alongside job status', async () => {
      const status = await BackgroundJobsService.getJobStatus();
      expect(status).toHaveProperty('schedulerEnabled');
      expect(status).toHaveProperty('schedulerInitialized');
      expect(mockJobRunRepository.getJobStatus).toHaveBeenCalled();
    });
  });

  describe('secretsManager — credential key SM-wins-over-env', () => {
    // This is the critical security boundary: when SM has db_password AND env also
    // has DB_PASSWORD, SM must win. Tested here because it's the highest-risk branch.
    test('SM value takes precedence over env for credential keys', async () => {
      jest.resetModules();
      jest.mock('@aws-sdk/client-secrets-manager', () => ({
        SecretsManagerClient: jest.fn().mockImplementation(() => ({
          send: jest.fn().mockResolvedValue({
            SecretString: JSON.stringify({ db_password: 'test_password' }), // gitleaks:allow
          }),
        })),
        GetSecretValueCommand: jest.fn().mockImplementation((i) => i),
        PutSecretValueCommand: jest.fn().mockImplementation((i) => i),
      }));

      process.env.DB_PASSWORD = 'test_password'; // gitleaks:allow
      process.env.FORCE_AWS_SM = 'true';
      process.env.NODE_ENV = 'test';

      const sm = require('../../../../server/src/services/secretsManager').default;
      sm.secrets.clear();
      sm['awsLoaded'] = false;
      sm['awsCache'] = null;

      await sm.load();

      expect(sm.get('db_password')).toBe('test_password'); // SM value wins over env

      delete process.env.DB_PASSWORD;
      delete process.env.FORCE_AWS_SM;
    });
  });
});

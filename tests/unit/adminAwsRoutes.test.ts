import express from 'express';
import request from 'supertest';

const mockGetAwsConfig = jest.fn();
const mockBuildClientConfig = jest.fn();
const mockListInstances = jest.fn();
const mockBuildStateCounts = jest.fn();
const mockIsAccessDeniedError = jest.fn();
const mockStsSend = jest.fn();
const mockEc2Client = {};

jest.mock('../../server/src/config/container', () => ({
  awsService: { getAwsConfig: mockGetAwsConfig },
}));

jest.mock('../../server/src/api/routes/v1/admin/adminAwsHelpers', () => ({
  buildClientConfig: mockBuildClientConfig,
  listInstances: mockListInstances,
  buildStateCounts: mockBuildStateCounts,
  isAccessDeniedError: mockIsAccessDeniedError,
  isCredentialError: jest.fn(),
  EC2Client: jest.fn(() => mockEc2Client),
  STSClient: jest.fn(() => ({ send: mockStsSend })),
  GetCallerIdentityCommand: jest.fn((input) => input),
}));

jest.mock('../../server/src/logging/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
}));

const {
  EC2Client,
  STSClient,
  GetCallerIdentityCommand,
} = require('../../server/src/api/routes/v1/admin/adminAwsHelpers');

describe('admin AWS overview route', () => {
  let app: express.Express;

  beforeAll(() => {
    process.env.DB_HOST = 'postgres';
    process.env.NODE_ENV = 'test';
    app = express();
    app.use('/api', require('../../server/src/api/routes/v1/admin/aws'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    EC2Client.mockImplementation(() => mockEc2Client);
    STSClient.mockImplementation(() => ({ send: mockStsSend }));
    GetCallerIdentityCommand.mockImplementation((input: any) => input);
    mockGetAwsConfig.mockResolvedValue({ region: 'us-east-1' });
    mockBuildClientConfig.mockResolvedValue({ region: 'us-east-1' });
    mockStsSend.mockResolvedValue({
      Account: '123',
      Arn: 'arn:test',
      UserId: 'user',
    });
    mockListInstances.mockResolvedValue([{ id: 'i-1', state: 'running' }]);
    mockBuildStateCounts.mockReturnValue({ total: 1, states: { running: 1 } });
    mockIsAccessDeniedError.mockReturnValue(false);
  });

  it('returns 503 when AWS is not configured', async () => {
    mockGetAwsConfig.mockResolvedValue({ region: '' });

    const response = await request(app).get('/api/admin/aws/overview');

    expect(response.status).toBe(503);
    expect(response.body.code).toBe('AWS_NOT_CONFIGURED');
  });

  it('returns identity, instance counts, and local mode', async () => {
    const response = await request(app).get('/api/admin/aws/overview');

    expect(response.body).toEqual({
      ok: true,
      configured: true,
      credentialsAvailable: true,
      mode: 'local',
      region: 'us-east-1',
      identity: { account: '123', arn: 'arn:test', userId: 'user' },
      counts: { total: 1, states: { running: 1 } },
      instances: [{ id: 'i-1', state: 'running' }],
    });
    expect(mockListInstances).toHaveBeenCalledWith(mockEc2Client);
  });

  it('continues when caller identity cannot be resolved', async () => {
    mockStsSend.mockRejectedValue(new Error('no identity'));

    const response = await request(app).get('/api/admin/aws/overview');

    expect(response.body.configured).toBe(false);
    expect(response.body.credentialsAvailable).toBe(false);
    expect(response.body.identity).toBeNull();
  });

  it('reports missing DescribeInstances permission', async () => {
    mockListInstances.mockRejectedValue(new Error('denied'));
    mockIsAccessDeniedError.mockReturnValue(true);

    const response = await request(app).get('/api/admin/aws/overview');

    expect(response.body.warning).toContain('ec2:DescribeInstances');
    expect(response.body.instances).toEqual([]);
  });

  it('reports missing local credentials for other SDK errors', async () => {
    mockListInstances.mockRejectedValue(new Error('credentials missing'));

    const response = await request(app).get('/api/admin/aws/overview');

    expect(response.body.warning).toContain('Local runtime has no AWS credentials');
  });

  it('returns a stable AWS error response for setup failures', async () => {
    mockGetAwsConfig.mockRejectedValue(new Error('config failed'));

    const response = await request(app).get('/api/admin/aws/overview');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ ok: false, error: 'config failed', code: 'AWS_ERROR' });
  });
});

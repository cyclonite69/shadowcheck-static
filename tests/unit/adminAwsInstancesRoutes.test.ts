import express from 'express';
import request from 'supertest';

const mockSend = jest.fn();

class MockEC2Client {
  send(command: any) {
    return mockSend(command);
  }
}

jest.mock('@aws-sdk/client-ec2', () => {
  return {
    EC2Client: MockEC2Client,
    StartInstancesCommand: jest.fn().mockImplementation((args) => ({ command: 'start', ...args })),
    StopInstancesCommand: jest.fn().mockImplementation((args) => ({ command: 'stop', ...args })),
    RebootInstancesCommand: jest
      .fn()
      .mockImplementation((args) => ({ command: 'reboot', ...args })),
    TerminateInstancesCommand: jest
      .fn()
      .mockImplementation((args) => ({ command: 'terminate', ...args })),
  };
});

const awsService = {
  getAwsConfig: jest.fn(),
};

const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.mock('../../server/src/config/container', () => ({
  awsService,
}));

jest.mock('../../server/src/logging/logger', () => logger);

const awsInstancesRouter = require('../../server/src/api/routes/v1/admin/awsInstances').default;

const app = express();
app.use(express.json());
app.use('/api', awsInstancesRouter);

describe('AWS EC2 Instance Management Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /instances/:instanceId/start', () => {
    it('starts instance successfully when configured', async () => {
      awsService.getAwsConfig.mockResolvedValueOnce({ region: 'us-east-1' });
      mockSend.mockResolvedValueOnce({});

      const res = await request(app).post('/api/instances/i-1234567890abcdef0/start');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.message).toContain('starting');
      expect(logger.info).toHaveBeenCalledWith('Started EC2 instance: i-1234567890abcdef0');
    });

    it('returns 500 when region is missing', async () => {
      awsService.getAwsConfig.mockResolvedValueOnce({ region: null });

      const res = await request(app).post('/api/instances/i-1234567890abcdef0/start');

      expect(res.status).toBe(500);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toBe('AWS region not configured');
    });

    it('returns 500 on SDK error', async () => {
      awsService.getAwsConfig.mockResolvedValueOnce({ region: 'us-east-1' });
      mockSend.mockRejectedValueOnce(new Error('AWS client error'));

      const res = await request(app).post('/api/instances/i-1234567890abcdef0/start');

      expect(res.status).toBe(500);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toBe('AWS client error');
    });
  });

  describe('POST /instances/:instanceId/stop', () => {
    it('stops instance successfully', async () => {
      awsService.getAwsConfig.mockResolvedValueOnce({ region: 'us-east-1' });
      mockSend.mockResolvedValueOnce({});

      const res = await request(app).post('/api/instances/i-1234567890abcdef0/stop');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('Stopped EC2 instance: i-1234567890abcdef0');
    });
  });

  describe('POST /instances/:instanceId/reboot', () => {
    it('reboots instance successfully', async () => {
      awsService.getAwsConfig.mockResolvedValueOnce({ region: 'us-east-1' });
      mockSend.mockResolvedValueOnce({});

      const res = await request(app).post('/api/instances/i-1234567890abcdef0/reboot');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('Rebooted EC2 instance: i-1234567890abcdef0');
    });
  });

  describe('POST /instances/:instanceId/terminate', () => {
    it('returns 400 if confirmation does not match instanceId', async () => {
      const res = await request(app)
        .post('/api/instances/i-1234567890abcdef0/terminate')
        .send({ confirm: 'different-id' });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toContain('Confirmation required');
    });

    it('terminates instance successfully when confirmed', async () => {
      awsService.getAwsConfig.mockResolvedValueOnce({ region: 'us-east-1' });
      mockSend.mockResolvedValueOnce({});

      const res = await request(app)
        .post('/api/instances/i-1234567890abcdef0/terminate')
        .send({ confirm: 'i-1234567890abcdef0' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(logger.warn).toHaveBeenCalledWith('Terminated EC2 instance: i-1234567890abcdef0');
    });
  });
});

import request from 'supertest';
import express from 'express';

// Mock container
jest.mock('../../../../server/src/config/container', () => ({
  adminDbService: {
    saveMLModelConfig: jest.fn(),
  },
  mlScoringService: {
    getMLModelStatus: jest.fn(),
    getMLTrainingData: jest.fn(),
    scoreAllNetworks: jest.fn(),
    getMLScoreForNetwork: jest.fn(),
    getNetworksByThreatLevel: jest.fn(),
  },
  mlTrainingLock: {
    acquire: jest.fn(),
    release: jest.fn(),
    status: jest.fn(),
  },
}));

// Mock feature flag service - FORCE ALL FLAGS TO TRUE
jest.mock('../../../../server/src/services/featureFlagService', () => ({
  getFlag: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../../server/src/logging/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const mockTrain = jest.fn();

// Mock ML trainer
jest.mock('../../../../server/src/services/ml/trainer', () => {
  return jest.fn().mockImplementation(() => ({
    train: mockTrain,
  }));
});

// Mock auth middleware
jest.mock('../../../../server/src/middleware/authMiddleware', () => ({
  requireAdmin: (req: any, res: any, next: any) => next(),
}));

const container = require('../../../../server/src/config/container');
const featureFlagService = require('../../../../server/src/services/featureFlagService');
const mlRouter = require('../../../../server/src/api/routes/v1/ml');

const app = express();
app.use(express.json());
app.use('/api', mlRouter);
app.use((error: Error, _req: unknown, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ error: error.message });
});

describe('ML API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    featureFlagService.getFlag.mockReturnValue(true);

    mockTrain.mockResolvedValue({
      coefficients: [0.1, 0.2],
      intercept: 0.5,
      featureNames: ['f1', 'f2'],
      trainingSamples: 10,
      threatCount: 5,
      safeCount: 5,
      accuracy: 0.95,
    });
  });

  describe('GET /api/ml/status', () => {
    it('should return model status', async () => {
      container.mlScoringService.getMLModelStatus.mockResolvedValue({
        lastTrained: '2023-01-01T00:00:00Z',
        networkCount: 100,
      });

      const res = await request(app).get('/api/ml/status');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('should pass model status errors to the error handler', async () => {
      container.mlScoringService.getMLModelStatus.mockRejectedValue(new Error('status failed'));

      const res = await request(app).get('/api/ml/status');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('status failed');
    });
  });

  describe('POST /api/ml/train', () => {
    it('should train the model successfully', async () => {
      container.mlTrainingLock.acquire.mockReturnValue(true);
      container.mlScoringService.getMLTrainingData.mockResolvedValue(new Array(10).fill({}));

      const res = await request(app).post('/api/ml/train').send({ auto_score: false });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(container.mlTrainingLock.release).toHaveBeenCalled();
    });

    it('should reject disabled training and concurrent runs', async () => {
      featureFlagService.getFlag.mockReturnValueOnce(false);
      const disabled = await request(app).post('/api/ml/train');
      expect(disabled.status).toBe(403);

      featureFlagService.getFlag.mockReturnValue(true);
      container.mlTrainingLock.acquire.mockReturnValue(false);
      container.mlTrainingLock.status.mockReturnValue({
        lockedAt: '2026-06-01T00:00:00Z',
      });
      const locked = await request(app).post('/api/ml/train');
      expect(locked.status).toBe(409);
      expect(locked.body.lockedAt).toBe('2026-06-01T00:00:00Z');
    });

    it('should require enough tagged networks and release the lock', async () => {
      container.mlTrainingLock.acquire.mockReturnValue(true);
      container.mlScoringService.getMLTrainingData.mockResolvedValue(new Array(9).fill({}));

      const res = await request(app).post('/api/ml/train');

      expect(res.status).toBe(400);
      expect(res.body.currentCount).toBe(9);
      expect(container.mlTrainingLock.release).toHaveBeenCalled();
    });

    it('should persist the model and start optional background scoring', async () => {
      container.mlTrainingLock.acquire.mockReturnValue(true);
      container.mlScoringService.getMLTrainingData.mockResolvedValue(new Array(10).fill({}));
      container.mlScoringService.scoreAllNetworks.mockResolvedValue({ scored: 4 });

      const res = await request(app).post('/api/ml/train').send({
        auto_score: true,
        auto_score_limit: 25,
        auto_score_overwrite: false,
      });
      await new Promise((resolve) => setImmediate(resolve));

      expect(res.status).toBe(200);
      expect(container.adminDbService.saveMLModelConfig).toHaveBeenCalledWith(
        'threat_logistic_regression',
        [0.1, 0.2],
        0.5,
        ['f1', 'f2']
      );
      expect(container.mlScoringService.scoreAllNetworks).toHaveBeenCalledWith({
        limit: 25,
        overwriteFinal: false,
      });
    });

    it('should release the lock when training fails', async () => {
      container.mlTrainingLock.acquire.mockReturnValue(true);
      container.mlScoringService.getMLTrainingData.mockRejectedValue(
        new Error('training data failed')
      );

      const res = await request(app).post('/api/ml/train');

      expect(res.status).toBe(500);
      expect(container.mlTrainingLock.release).toHaveBeenCalled();
    });
  });

  describe('POST /api/ml/score-all', () => {
    it('should enforce the scoring feature flag', async () => {
      featureFlagService.getFlag.mockReturnValueOnce(false);

      const res = await request(app).post('/api/ml/score-all');

      expect(res.status).toBe(403);
    });

    it('should score networks with normalized options', async () => {
      container.mlScoringService.scoreAllNetworks.mockResolvedValue({ scored: 12 });

      const res = await request(app)
        .post('/api/ml/score-all?limit=30')
        .send({ overwrite_final: 'false' });

      expect(res.status).toBe(200);
      expect(container.mlScoringService.scoreAllNetworks).toHaveBeenCalledWith({
        limit: '30',
        overwriteFinal: false,
      });
      expect(res.body.scored).toBe(12);
    });

    it('should pass scoring failures to the error handler', async () => {
      container.mlScoringService.scoreAllNetworks.mockRejectedValue(new Error('score failed'));

      const res = await request(app).post('/api/ml/score-all');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('score failed');
    });
  });

  describe('GET /api/ml/scores/:bssid', () => {
    it('should validate BSSIDs and report missing scores', async () => {
      const invalid = await request(app).get('/api/ml/scores/bad!');
      expect(invalid.status).toBe(400);

      container.mlScoringService.getMLScoreForNetwork.mockResolvedValue(null);
      const missing = await request(app).get('/api/ml/scores/AA:BB:CC:DD:EE:FF');
      expect(missing.status).toBe(404);
    });

    it('should return a score for a normalized BSSID', async () => {
      container.mlScoringService.getMLScoreForNetwork.mockResolvedValue({
        bssid: 'AA:BB:CC:DD:EE:FF',
        score: 82,
      });

      const res = await request(app).get('/api/ml/scores/aa:bb:cc:dd:ee:ff');

      expect(res.status).toBe(200);
      expect(container.mlScoringService.getMLScoreForNetwork).toHaveBeenCalledWith(
        'AA:BB:CC:DD:EE:FF'
      );
    });
  });

  describe('GET /api/ml/scores/level/:level', () => {
    it('should validate threat levels and limits', async () => {
      const invalidLevel = await request(app).get('/api/ml/scores/level/UNKNOWN');
      const invalidLimit = await request(app).get('/api/ml/scores/level/HIGH?limit=501');

      expect(invalidLevel.status).toBe(400);
      expect(invalidLimit.status).toBe(400);
    });

    it('should return networks for a threat level', async () => {
      container.mlScoringService.getNetworksByThreatLevel.mockResolvedValue([
        { bssid: 'AA:BB:CC:DD:EE:FF' },
      ]);

      const res = await request(app).get('/api/ml/scores/level/HIGH?limit=20');

      expect(res.status).toBe(200);
      expect(container.mlScoringService.getNetworksByThreatLevel).toHaveBeenCalledWith('HIGH', 20);
      expect(res.body.count).toBe(1);
    });
  });
});

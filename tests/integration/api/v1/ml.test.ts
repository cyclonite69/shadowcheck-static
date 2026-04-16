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
app.use('/api/v1', mlRouter);

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

  describe('GET /api/v1/ml/status', () => {
    it('should return model status', async () => {
      container.mlScoringService.getMLModelStatus.mockResolvedValue({
        lastTrained: '2023-01-01T00:00:00Z',
        networkCount: 100,
      });

      const res = await request(app).get('/api/v1/ml/status');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('POST /api/v1/ml/train', () => {
    it('should train the model successfully', async () => {
      container.mlTrainingLock.acquire.mockReturnValue(true);
      container.mlScoringService.getMLTrainingData.mockResolvedValue(new Array(10).fill({}));
      
      const res = await request(app).post('/api/v1/ml/train').send({ auto_score: false });
      
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });
});

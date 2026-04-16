import request from 'supertest';
import express from 'express';
// Note: dashboard.ts exports an object { router, initDashboardRoutes }
const { router, initDashboardRoutes } = require('../../../../server/src/api/routes/v1/dashboard');

const mockDashboardService = {
  getMetrics: jest.fn().mockResolvedValue({
    totalNetworks: 10,
    threatsCritical: 1,
    threatsHigh: 0,
    threatsMedium: 0,
    threatsLow: 0,
    activeSurveillance: 0,
    lastUpdated: new Date().toISOString(),
  }),
  getThreats: jest.fn().mockResolvedValue([]),
};

initDashboardRoutes({ dashboardService: mockDashboardService });

const app = express();
app.use('/api/v1', router);

describe('GET /api/v1/dashboard/summary', () => {
  it('should return dashboard summary metrics', async () => {
    const res = await request(app).get('/api/v1/dashboard/summary');
    expect(res.status).toBe(200);
    expect(res.body.summary.totalNetworks).toBe(10);
    expect(res.body.summary.criticalThreats).toBe(1);
  });
});

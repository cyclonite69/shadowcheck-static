import request from 'supertest';
import express from 'express';

const mockWigleService = {
  getWiglePageNetworkFromMv: jest.fn(),
  getWiglePageNetwork: jest.fn(),
  getWigleDetail: jest.fn(),
  searchWigleDatabase: jest.fn(),
  getWigleDatabase: jest.fn(),
  checkWigleV3TableExists: jest.fn(),
  getKmlBssidSummary: jest.fn(),
  getKmlPointsForMap: jest.fn(),
};

jest.mock('../../../../../../server/src/config/container', () => ({
  wigleService: mockWigleService,
}));

jest.mock('../../../../../../server/src/logging/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../../../../../server/src/validation/middleware', () => {
  const original = jest.requireActual('../../../../../../server/src/validation/middleware');
  return {
    ...original,
    macParamMiddleware: (req: any, res: any, next: any) => next(),
    validateQuery: (schema: any) => (req: any, res: any, next: any) => {
      req.validated = {};
      if (schema) {
        for (const [key, validator] of Object.entries(schema)) {
          if (req.query[key] !== undefined) {
            const v: any = (validator as Function)(req.query[key]);
            if (v && v.valid === false) {
              return res.status(400).json({ error: v.error });
            }
            req.validated[key] = v ? v.value : req.query[key];
          }
        }
      }
      next();
    },
  };
});

const databaseRouter = require('../../../../../../server/src/api/routes/v1/wigle/database').default;

const app = express();
app.use(express.json());
app.use('/', databaseRouter);

describe('WiGLE Database Routes - Comprehensive Final', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWigleService.getWigleDatabase.mockResolvedValue({ rows: [], total: 0 });
    mockWigleService.getKmlPointsForMap.mockResolvedValue({ rows: [], total: 0 });
  });

  it('GET /page/network/:netid', async () => {
    mockWigleService.getWiglePageNetworkFromMv.mockResolvedValue(null);
    mockWigleService.getWiglePageNetwork.mockResolvedValue({ id: 'test' });
    await request(app).get('/page/network/AA:BB:CC:DD:EE:FF').expect(200);
  });

  it('GET /network/:bssid', async () => {
    mockWigleService.getWigleDetail.mockResolvedValue({ id: 'test' });
    await request(app).get('/network/AA:BB:CC:DD:EE:FF').expect(200);
  });

  it('GET /search', async () => {
    mockWigleService.searchWigleDatabase.mockResolvedValue([]);
    await request(app).get('/search?ssid=test').expect(200);
  });

  it('GET /networks-v2', async () => {
    await request(app).get('/networks-v2?include_total=1').expect(200);
  });

  it('GET /networks-v3', async () => {
    mockWigleService.checkWigleV3TableExists.mockResolvedValue(true);
    await request(app).get('/networks-v3').expect(200);
  });

  it('GET /kml-bssid-summary', async () => {
    mockWigleService.getKmlBssidSummary.mockResolvedValue({ count: 1 });
    await request(app).get('/kml-bssid-summary?bssid=AA').expect(200);
  });

  it('GET /kml-points', async () => {
    await request(app).get('/kml-points').expect(200);
  });

  it('covers validation failures', async () => {
    await request(app).get('/networks-v2?include_total=maybe').expect(400);
  });
});

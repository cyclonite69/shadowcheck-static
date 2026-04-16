import request from 'supertest';
import express from 'express';

// Mock dependencies
jest.mock('../../../../server/src/config/container', () => ({
  agencyService: {
    getAgencyOfficesGeoJSON: jest.fn(),
    getAgencyOfficeCountByType: jest.fn(),
  },
}));

const { agencyService } = require('../../../../server/src/config/container');
const agencyOfficesRouter = require('../../../../server/src/api/routes/v1/agencyOffices').default;

const app = express();
app.use(express.json());
app.use('/api/agency-offices', agencyOfficesRouter);

describe('agencyOffices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return geojson', async () => {
    agencyService.getAgencyOfficesGeoJSON.mockResolvedValue({ type: 'FeatureCollection', features: [] });
    const res = await request(app).get('/api/agency-offices');
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('FeatureCollection');
  });

  it('should return counts', async () => {
    agencyService.getAgencyOfficeCountByType.mockResolvedValue([{ type: 'FO', count: '5' }]);
    const res = await request(app).get('/api/agency-offices/count');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(5);
  });
});

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
app.use('/agency-offices', agencyOfficesRouter);

describe('agencyOffices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return geojson', async () => {
    agencyService.getAgencyOfficesGeoJSON.mockResolvedValue({
      type: 'FeatureCollection',
      features: [],
    });
    const res = await request(app).get('/agency-offices');
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('FeatureCollection');
  });

  it('should handle error when fetching geojson fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    agencyService.getAgencyOfficesGeoJSON.mockRejectedValue(new Error('DB error'));
    const res = await request(app).get('/agency-offices');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      ok: false,
      error: 'Failed to fetch agency offices',
    });
  });

  it('should return counts', async () => {
    agencyService.getAgencyOfficeCountByType.mockResolvedValue([{ type: 'FO', count: '5' }]);
    const res = await request(app).get('/agency-offices/count');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(5);
  });

  it('should handle error when counting agency offices fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    agencyService.getAgencyOfficeCountByType.mockRejectedValue(new Error('DB error'));
    const res = await request(app).get('/agency-offices/count');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      ok: false,
      error: 'Failed to count agency offices',
    });
  });
});

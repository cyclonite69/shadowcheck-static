import express from 'express';
import request from 'supertest';

const miscService = {
  getDataQualityMetrics: jest.fn(),
};
const dataQualityFilters = {
  DATA_QUALITY_FILTERS: {
    temporal_clusters: 'temporal clause',
    extreme_signals: 'extreme clause',
    duplicate_coords: 'duplicate clause',
    all: jest.fn(() => 'all clause'),
  },
};
const logger = {
  error: jest.fn(),
};

jest.mock('../../server/src/config/container', () => ({
  miscService,
  dataQualityFilters,
}));

jest.mock('../../server/src/logging/logger', () => logger);

const router = require('../../server/src/api/routes/v1/dataQuality').default;

const app = express();
app.use('/api', router);

describe('data quality routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dataQualityFilters.DATA_QUALITY_FILTERS.all.mockReturnValue('all clause');
    miscService.getDataQualityMetrics.mockResolvedValue({ total: 4 });
  });

  it.each([
    [undefined, 'none', ''],
    ['temporal', 'temporal', 'temporal clause'],
    ['extreme', 'extreme', 'extreme clause'],
    ['duplicate', 'duplicate', 'duplicate clause'],
    ['unknown', 'unknown', ''],
  ])('maps filter %s to its query clause', async (filter, expectedFilter, expectedClause) => {
    const response = await request(app)
      .get('/api/data-quality')
      .query(filter ? { filter } : {});

    expect(response.status).toBe(200);
    expect(miscService.getDataQualityMetrics).toHaveBeenCalledWith(expectedClause);
    expect(response.body).toEqual({ filter_applied: expectedFilter, total: 4 });
  });

  it('builds the combined data-quality filter', async () => {
    const response = await request(app).get('/api/data-quality?filter=all');

    expect(response.status).toBe(200);
    expect(dataQualityFilters.DATA_QUALITY_FILTERS.all).toHaveBeenCalled();
    expect(miscService.getDataQualityMetrics).toHaveBeenCalledWith('all clause');
  });

  it('returns and logs service errors', async () => {
    miscService.getDataQualityMetrics.mockRejectedValueOnce(new Error('metrics failed'));

    const response = await request(app).get('/api/data-quality');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ success: false, error: 'metrics failed' });
    expect(logger.error).toHaveBeenCalledWith(
      'Data quality error: metrics failed',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});

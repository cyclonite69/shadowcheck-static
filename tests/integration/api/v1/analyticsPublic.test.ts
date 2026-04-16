import request from 'supertest';
import express from 'express';

// Mock dependencies
jest.mock('../../../../server/src/api/routes/v2/filteredHelpers', () => ({
  parseAndValidateFilters: jest.fn(),
  isParseValidatedFiltersError: jest.fn(),
  assertHomeExistsIfNeeded: jest.fn(),
}));

jest.mock('../../../../server/src/config/container', () => ({
  filterQueryBuilder: {
    validateFilterPayload: jest.fn(),
  },
  filteredAnalyticsService: {
    getFilteredAnalytics: jest.fn(),
  },
}));

const { parseAndValidateFilters, isParseValidatedFiltersError, assertHomeExistsIfNeeded } = require('../../../../server/src/api/routes/v2/filteredHelpers');
const { filteredAnalyticsService } = require('../../../../server/src/config/container');
const analyticsPublicRouter = require('../../../../server/src/api/routes/v1/analytics-public');

const app = express();
app.use(express.json());
app.use('/api/analytics-public', analyticsPublicRouter);

describe('analytics-public', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return analytics data', async () => {
    parseAndValidateFilters.mockReturnValue({ filters: {}, enabled: {} });
    isParseValidatedFiltersError.mockReturnValue(false);
    assertHomeExistsIfNeeded.mockResolvedValue(true);
    filteredAnalyticsService.getFilteredAnalytics.mockResolvedValue({
      data: { stats: 123 },
      queryDurationMs: 10,
    });

    const res = await request(app).get('/api/analytics-public/filtered');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.stats).toBe(123);
  });
});

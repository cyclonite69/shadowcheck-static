const {
  saveInsight,
  getInsightHistory,
  markInsightUseful,
} = require('../../../server/src/services/aiInsightsService');
const { adminQuery } = require('../../../server/src/services/adminDbService');
const { query } = require('../../../server/src/config/database');
const logger = require('../../../server/src/logging/logger');

jest.mock('../../../server/src/services/adminDbService');
jest.mock('../../../server/src/config/database');
jest.mock('../../../server/src/logging/logger');

describe('aiInsightsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveInsight', () => {
    it('should insert an insight and return the id', async () => {
      const mockResult = { rows: [{ id: 123 }] };
      adminQuery.mockResolvedValue(mockResult);

      const params = {
        question: 'What?',
        filteredNetworks: [],
        claudeResponse: 'Nothing.',
        suggestions: ['A', 'B'],
      };

      const id = await saveInsight(params);
      expect(id).toBe(123);
      expect(adminQuery).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('id=123'));
    });
  });

  describe('getInsightHistory', () => {
    it('should fetch history with userId', async () => {
      const mockResult = { rows: [{ id: 1 }] };
      query.mockResolvedValue(mockResult);

      const history = await getInsightHistory('user123', 5);
      expect(history).toEqual(mockResult.rows);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE user_id = $1'), [
        'user123',
        5,
      ]);
    });

    it('should fetch global history when userId is null', async () => {
      const mockResult = { rows: [{ id: 1 }] };
      query.mockResolvedValue(mockResult);

      const history = await getInsightHistory(null, 10);
      expect(history).toEqual(mockResult.rows);
      expect(query).toHaveBeenCalledWith(expect.not.stringContaining('WHERE user_id = $1'), [10]);
    });
  });

  describe('markInsightUseful', () => {
    it('should update the useful status', async () => {
      adminQuery.mockResolvedValue({});
      await markInsightUseful(123, true);
      expect(adminQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE app.ai_insights'), [
        true,
        123,
      ]);
      expect(logger.info).toHaveBeenCalled();
    });
  });
});

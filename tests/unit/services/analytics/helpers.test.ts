/**
 * Analytics Helpers Unit Tests
 */

export {};

const helpers = require('../../../../server/src/services/analytics/helpers');

describe('Analytics Helpers', () => {
  describe('normalizeAnalyticsResult', () => {
    it('should convert count strings to numbers', () => {
      const input = [
        { type: 'WiFi', count: '10' },
        { type: 'BT', count: '5' },
      ];
      const expected = [
        { type: 'WiFi', count: 10 },
        { type: 'BT', count: 5 },
      ];
      expect(helpers.normalizeAnalyticsResult(input)).toEqual(expected);
    });

    it('should handle rows without count field', () => {
      const input = [{ type: 'WiFi' }, { type: 'BT', count: 5 }];
      const expected = [
        { type: 'WiFi', count: 0 },
        { type: 'BT', count: 5 },
      ];
      expect(helpers.normalizeAnalyticsResult(input)).toEqual(expected);
    });

    it('should handle already numeric counts', () => {
      const input = [{ type: 'WiFi', count: 10 }];
      const expected = [{ type: 'WiFi', count: 10 }];
      expect(helpers.normalizeAnalyticsResult(input)).toEqual(expected);
    });
  });

  describe('formatAnalyticsData', () => {
    it('should add generatedAt timestamp to data', () => {
      const input = { stats: [1, 2, 3] };
      const result = helpers.formatAnalyticsData(input);
      expect(result.stats).toEqual([1, 2, 3]);
      expect(result.generatedAt).toBeDefined();
      expect(new Date(result.generatedAt as string).toString()).not.toBe('Invalid Date');
    });
  });

  describe('validateAnalyticsParams', () => {
    it('should return valid for correct params', () => {
      expect(helpers.validateAnalyticsParams({ limit: 100, range: '24h' })).toEqual({
        valid: true,
      });
      expect(helpers.validateAnalyticsParams({ range: '7d' })).toEqual({ valid: true });
      expect(helpers.validateAnalyticsParams({ limit: 500 })).toEqual({ valid: true });
    });

    it('should return error for invalid limit', () => {
      const result = helpers.validateAnalyticsParams({ limit: 0 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Limit');

      const result2 = helpers.validateAnalyticsParams({ limit: 10001 });
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain('Limit');

      const result3 = helpers.validateAnalyticsParams({ limit: NaN });
      expect(result3.valid).toBe(false);
      expect(result3.error).toContain('Limit');
    });

    it('should return error for invalid range', () => {
      const result = helpers.validateAnalyticsParams({ range: 'invalid' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Range');
    });
  });

  describe('applyFiltersToAnalytics', () => {
    it('should return base query when no filters', () => {
      const base = 'SELECT * FROM test';
      const result = helpers.applyFiltersToAnalytics(base, []);
      expect(result.query).toBe(base);
      expect(result.params).toEqual([]);
    });

    it('should apply filters and combine params', () => {
      const base = 'SELECT * FROM test';
      const filters = [
        { condition: 'id = $1', param: 1 },
        { condition: 'name = $2', param: 'test' },
      ];
      const result = helpers.applyFiltersToAnalytics(base, filters);
      expect(result.query).toBe('SELECT * FROM test WHERE id = $1 AND name = $2');
      expect(result.params).toEqual([1, 'test']);
    });
  });

  describe('calculateAggregates', () => {
    const data = [{ val: 10 }, { val: 20 }, { val: 30 }];

    it('should calculate sum', () => {
      expect(helpers.calculateAggregates(data, 'val', 'sum')).toBe(60);
    });

    it('should calculate avg', () => {
      expect(helpers.calculateAggregates(data, 'val', 'avg')).toBe(20);
    });

    it('should calculate min', () => {
      expect(helpers.calculateAggregates(data, 'val', 'min')).toBe(10);
    });

    it('should calculate max', () => {
      expect(helpers.calculateAggregates(data, 'val', 'max')).toBe(30);
    });

    it('should handle empty data', () => {
      expect(helpers.calculateAggregates([], 'val', 'sum')).toBe(0);
    });

    it('should handle non-numeric values gracefully', () => {
      const mixedData = [{ val: '10' }, { val: 'abc' }, { val: 20 }];
      expect(helpers.calculateAggregates(mixedData, 'val', 'sum')).toBe(30);
    });
  });

  describe('rangeToMilliseconds', () => {
    it('should return correct timestamp for 24h', () => {
      const before = Date.now();
      const result = helpers.rangeToMilliseconds('24h');
      const after = Date.now();
      const expected = 24 * 60 * 60 * 1000;
      expect(before - result).toBeLessThanOrEqual(expected + 100);
      expect(after - result).toBeGreaterThanOrEqual(expected - 100);
    });

    it('should default to 30d for invalid range', () => {
      const result = helpers.rangeToMilliseconds('invalid');
      const expected = 30 * 24 * 60 * 60 * 1000;
      const diff = Date.now() - result;
      expect(diff).toBeGreaterThanOrEqual(expected - 100);
      expect(diff).toBeLessThanOrEqual(expected + 100);
    });
  });
});

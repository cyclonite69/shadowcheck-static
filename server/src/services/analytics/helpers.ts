/**
 * Analytics Helpers Module
 * Utility functions for analytics normalization, formatting, and validation
 */

export {};

interface AnalyticsRow {
  count?: string | number;
  [key: string]: unknown;
}

interface FilterCondition {
  condition: string;
  param: unknown;
}

interface FilterResult {
  query: string;
  params: unknown[];
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Normalizes analytics result counts to numbers.
 */
function normalizeAnalyticsResult(rows: AnalyticsRow[]): AnalyticsRow[] {
  return rows.map((row) => ({
    ...row,
    count: row.count ? parseInt(String(row.count)) : 0,
  }));
}

/**
 * Formats analytics data for API response.
 */
function formatAnalyticsData(data: Record<string, unknown>): Record<string, unknown> {
  return {
    ...data,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Validates analytics parameters.
 */
function validateAnalyticsParams(params: { limit?: number; range?: string }): ValidationResult {
  if (
    params.limit !== undefined &&
    (isNaN(params.limit) || params.limit < 1 || params.limit > 10000)
  ) {
    return { valid: false, error: 'Limit must be between 1 and 10000' };
  }

  const validRanges = ['24h', '7d', '30d', '90d', 'all'];
  if (params.range && !validRanges.includes(params.range)) {
    return { valid: false, error: `Range must be one of: ${validRanges.join(', ')}` };
  }

  return { valid: true };
}

/**
 * Applies filters to analytics query.
 */
function applyFiltersToAnalytics(baseQuery: string, filters: FilterCondition[]): FilterResult {
  if (filters.length === 0) {
    return { query: baseQuery, params: [] };
  }

  const whereClause = filters.map((f) => f.condition).join(' AND ');
  const params = filters.map((f) => f.param);

  return {
    query: `${baseQuery} WHERE ${whereClause}`,
    params,
  };
}

/**
 * Calculates aggregates from analytics data.
 */
function calculateAggregates(
  data: Record<string, unknown>[],
  field: string,
  operation: 'sum' | 'avg' | 'min' | 'max'
): number {
  if (data.length === 0) {
    return 0;
  }

  const values = data.map((item) => {
    const val = item[field];
    return typeof val === 'number' ? val : parseFloat(String(val)) || 0;
  });

  switch (operation) {
    case 'sum':
      return values.reduce((acc, val) => acc + val, 0);
    case 'avg':
      return values.reduce((acc, val) => acc + val, 0) / values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    default:
      return 0;
  }
}

/**
 * Converts timestamp range to milliseconds.
 */
function rangeToMilliseconds(range: string): number {
  const now = Date.now();
  const ranges: Record<string, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
    all: 365 * 24 * 60 * 60 * 1000,
  };
  return now - (ranges[range] || ranges['30d']);
}

module.exports = {
  normalizeAnalyticsResult,
  formatAnalyticsData,
  validateAnalyticsParams,
  applyFiltersToAnalytics,
  calculateAggregates,
  rangeToMilliseconds,
};

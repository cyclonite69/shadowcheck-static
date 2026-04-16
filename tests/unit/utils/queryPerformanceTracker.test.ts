import { QueryPerformanceTracker } from '../../../server/src/utils/queryPerformanceTracker';

// Mock the logger
jest.mock('../../../server/src/logging/logger', () => ({
  warn: jest.fn(),
  info: jest.fn(),
}));

const logger = require('../../../server/src/logging/logger');

describe('QueryPerformanceTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.DEBUG_QUERY_PERFORMANCE;
  });

  it('should initialize with default metrics', () => {
    const tracker = new QueryPerformanceTracker('testQuery');
    const metrics = tracker.finish();

    expect(metrics.queryType).toBe('testQuery');
    expect(metrics.pathTaken).toBe('unfiltered');
    expect(metrics.filterCount).toBe(0);
    expect(metrics.appliedFilters).toEqual([]);
    expect(metrics.ignoredFilters).toEqual([]);
    expect(metrics.warnings).toEqual([]);
    expect(metrics.totalTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('should set path', () => {
    const tracker = new QueryPerformanceTracker('testQuery');
    tracker.setPath('fast');
    const metrics = tracker.finish();

    expect(metrics.pathTaken).toBe('fast');
  });

  it('should add applied filters', () => {
    const tracker = new QueryPerformanceTracker('testQuery');
    tracker.addAppliedFilter('filter1', true);
    tracker.addAppliedFilter('filter2', false);
    const metrics = tracker.finish();

    expect(metrics.filterCount).toBe(2);
    expect(metrics.appliedFilters).toEqual([
      { filterType: 'filter1', enabled: true, applied: true },
      { filterType: 'filter2', enabled: false, applied: true },
    ]);
  });

  it('should add ignored filters', () => {
    const tracker = new QueryPerformanceTracker('testQuery');
    tracker.addIgnoredFilter('ignored1');
    const metrics = tracker.finish();

    expect(metrics.ignoredFilters).toEqual(['ignored1']);
  });

  it('should add warnings', () => {
    const tracker = new QueryPerformanceTracker('testQuery');
    tracker.addWarning('something is wrong');
    const metrics = tracker.finish();

    expect(metrics.warnings).toEqual(['something is wrong']);
  });

  it('should set result count', () => {
    const tracker = new QueryPerformanceTracker('testQuery');
    tracker.setResultCount(42);
    const metrics = tracker.finish();

    expect(metrics.resultCount).toBe(42);
  });

  it('should log a warning if the query has warnings', () => {
    const tracker = new QueryPerformanceTracker('testQuery');
    tracker.addWarning('warning');
    tracker.finish();

    expect(logger.warn).toHaveBeenCalledWith(
      '[QueryPerformance] Slow or problematic query',
      expect.objectContaining({ warnings: ['warning'] })
    );
  });

  it('should log info if DEBUG_QUERY_PERFORMANCE is true', () => {
    process.env.DEBUG_QUERY_PERFORMANCE = 'true';
    const tracker = new QueryPerformanceTracker('testQuery');
    tracker.finish();

    expect(logger.info).toHaveBeenCalledWith(
      '[QueryPerformance]',
      expect.objectContaining({ queryType: 'testQuery' })
    );
  });

  it('should NOT log info if DEBUG_QUERY_PERFORMANCE is NOT true', () => {
    process.env.DEBUG_QUERY_PERFORMANCE = 'false';
    const tracker = new QueryPerformanceTracker('testQuery');
    tracker.finish();

    expect(logger.info).not.toHaveBeenCalled();
  });

  it('should log a warning if query is slow (>1000ms)', async () => {
    const tracker = new QueryPerformanceTracker('testQuery');
    
    // Force a delay
    await new Promise(resolve => setTimeout(resolve, 1001));
    
    tracker.finish();

    expect(logger.warn).toHaveBeenCalledWith(
      '[QueryPerformance] Slow or problematic query',
      expect.objectContaining({ queryType: 'testQuery' })
    );
  });
});

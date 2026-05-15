export {};

const mockReconcileRunProgress = jest.fn();
const mockGetRunOrThrow = jest.fn();
const mockPersistPageFailure = jest.fn();
const mockMarkRunFailure = jest.fn();
const mockMarkRunControlStatus = jest.fn();
const mockCompleteRun = jest.fn();
const mockProcessSuccessfulPage = jest.fn();
const mockGetEncodedWigleAuth = jest.fn();
const mockSleep = jest.fn();
const mockGetAdaptiveDelay = jest.fn();
const mockFetchWiglePage = jest.fn();
const mockNormalizeImportParams = jest.fn();

jest.mock('../../server/src/services/wigleImport/runRepository', () => ({
  reconcileRunProgress: (...args: any[]) => mockReconcileRunProgress(...args),
  getRunOrThrow: (...args: any[]) => mockGetRunOrThrow(...args),
  persistPageFailure: (...args: any[]) => mockPersistPageFailure(...args),
  markRunFailure: (...args: any[]) => mockMarkRunFailure(...args),
  markRunControlStatus: (...args: any[]) => mockMarkRunControlStatus(...args),
  completeRun: (...args: any[]) => mockCompleteRun(...args),
}));

jest.mock('../../server/src/services/wigleImport/params', () => ({
  DEFAULT_RESULTS_PER_PAGE: 100,
  normalizeImportParams: (...args: any[]) => mockNormalizeImportParams(...args),
}));

jest.mock('../../server/src/services/wigleImport/pageProcessor', () => ({
  processSuccessfulPage: (...args: any[]) => mockProcessSuccessfulPage(...args),
}));

jest.mock('../../server/src/services/wigleImport/authProvider', () => ({
  getEncodedWigleAuth: (...args: any[]) => mockGetEncodedWigleAuth(...args),
}));

jest.mock('../../server/src/services/wigleImport/rateLimitingStrategy', () => ({
  getAdaptiveDelay: (...args: any[]) => mockGetAdaptiveDelay(...args),
  sleep: (...args: any[]) => mockSleep(...args),
}));

jest.mock('../../server/src/services/wigleImport/wigleApiClient', () => ({
  fetchWiglePage: (...args: any[]) => mockFetchWiglePage(...args),
}));

describe('WigleImportRunOrchestrator', () => {
  const getOrchestrator = () =>
    require('../../server/src/services/wigleImport/orchestrators/WigleImportRunOrchestrator')
      .WigleImportRunOrchestrator;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    mockNormalizeImportParams.mockImplementation((params: Record<string, unknown>) => ({
      resultsPerPage: 100,
      ...params,
    }));
    mockGetEncodedWigleAuth.mockReturnValue('encoded-auth');
    mockGetAdaptiveDelay.mockReturnValue(0);
    mockSleep.mockResolvedValue(undefined);
    mockPersistPageFailure.mockResolvedValue(undefined);
    mockMarkRunFailure.mockResolvedValue({ id: 1, status: 'failed' });
    mockMarkRunControlStatus.mockResolvedValue({ id: 1, status: 'paused' });
    mockCompleteRun.mockResolvedValue({ id: 1, status: 'completed' });
    mockProcessSuccessfulPage.mockResolvedValue({ id: 1, status: 'running' });
  });

  it('returns a completed run without fetching new pages', async () => {
    mockReconcileRunProgress.mockResolvedValue({ id: 1, status: 'completed' });

    const Orchestrator = getOrchestrator();
    const orchestrator = new Orchestrator();

    const result = await orchestrator.execute(1);

    expect(result).toEqual({ id: 1, status: 'completed' });
    expect(mockFetchWiglePage).not.toHaveBeenCalled();
  });

  it('completes the run when the first page returns no results and no next cursor', async () => {
    mockReconcileRunProgress.mockResolvedValue({
      id: 2,
      status: 'running',
      request_params: { ssid: 'empty-test', resultsPerPage: 100 },
    });
    mockGetRunOrThrow.mockResolvedValue({
      id: 2,
      status: 'running',
      next_page: 1,
      api_cursor: null,
      state: 'US',
      search_term: 'empty-test',
      api_total_results: null,
    });
    mockFetchWiglePage.mockResolvedValue({
      results: [],
      search_after: null,
      totalResults: 0,
    });
    mockCompleteRun.mockResolvedValue({ id: 2, status: 'completed' });

    const Orchestrator = getOrchestrator();
    const orchestrator = new Orchestrator();

    const result = await orchestrator.execute(2);

    expect(mockCompleteRun).toHaveBeenCalledWith(
      2,
      'No records returned on first page — API quota may be exhausted or no results match the search'
    );
    expect(result).toEqual({ id: 2, status: 'completed' });
    expect(mockPersistPageFailure).not.toHaveBeenCalled();
  });

  it('pauses the run after a repeated 429 response', async () => {
    mockReconcileRunProgress.mockResolvedValue({
      id: 3,
      status: 'running',
      request_params: { ssid: 'rate-limit-test', resultsPerPage: 100 },
    });
    mockGetRunOrThrow.mockResolvedValue({
      id: 3,
      status: 'running',
      next_page: 1,
      api_cursor: null,
      state: 'US',
      search_term: 'rate-limit-test',
      api_total_results: null,
    });
    mockFetchWiglePage
      .mockRejectedValueOnce({ status: 429, retryAfter: '1', message: 'rate limited' })
      .mockRejectedValueOnce({ status: 429, retryAfter: '1', message: 'rate limited again' });

    const Orchestrator = getOrchestrator();
    const orchestrator = new Orchestrator();

    const result = await orchestrator.execute(3);

    expect(mockSleep).toHaveBeenCalled();
    expect(mockPersistPageFailure).toHaveBeenCalledWith(3, 1, null, 'rate limited again');
    expect(mockMarkRunControlStatus).toHaveBeenCalledWith(3, 'paused');
    expect(result).toEqual({ id: 1, status: 'paused' });
  });
});

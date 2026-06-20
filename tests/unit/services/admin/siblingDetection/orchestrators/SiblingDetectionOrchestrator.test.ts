import { SiblingDetectionOrchestrator } from '../../../../../../server/src/services/admin/siblingDetection/orchestrators/SiblingDetectionOrchestrator';
import { type SiblingRefreshOptions } from '../../../../../../server/src/services/admin/siblingDetectionState';

describe('SiblingDetectionOrchestrator', () => {
  let mockAdminQuery: jest.Mock;
  let mockLongRunningAdminQuery: jest.Mock;
  let mockNormalizeOptions: jest.Mock;
  let mockState: any;
  let mockSiblingRunRepository: any;
  let mockSiblingPruningRepository: any;
  let mockExtraRules: any[];

  let orchestrator: SiblingDetectionOrchestrator;

  beforeEach(() => {
    mockAdminQuery = jest.fn().mockResolvedValue({ rows: [] });
    mockLongRunningAdminQuery = jest.fn().mockResolvedValue({ rows: [{ seed_count: 0 }] });
    mockNormalizeOptions = jest.fn().mockImplementation((opt) => ({
      batchSize: 100,
      maxOctetDelta: 2,
      maxDistanceM: 50,
      minCandidateConf: 0.8,
      incremental: false,
      maxBatches: null,
      ...opt,
    }));
    mockState = {
      cancelRequested: false,
      progress: {},
    };
    mockSiblingRunRepository = {
      createRun: jest.fn().mockResolvedValue(1001),
      getPreviousRunCutoff: jest.fn().mockResolvedValue('2026-06-01T00:00:00Z'),
      completeRun: jest.fn().mockResolvedValue(undefined),
    };
    mockSiblingPruningRepository = {
      checkHardwareOverflow: jest.fn().mockResolvedValue([]),
      pruneHardwareOverflow: jest.fn().mockResolvedValue(undefined),
      checkSequentialOverflow: jest.fn().mockResolvedValue([]),
      pruneSequentialOverflow: jest.fn().mockResolvedValue(0),
    };
    mockExtraRules = [
      {
        name: 'test-rule-1',
        logKey: 'testRule1',
        query: 'SELECT count(*) as count FROM app.network_siblings WHERE rule = $1',
        includeRunId: false,
      },
    ];

    orchestrator = new SiblingDetectionOrchestrator({
      adminQuery: mockAdminQuery,
      longRunningAdminQuery: mockLongRunningAdminQuery,
      normalizeOptions: mockNormalizeOptions,
      state: mockState,
      extraRules: mockExtraRules,
      siblingRunRepository: mockSiblingRunRepository,
      siblingPruningRepository: mockSiblingPruningRepository,
    });
  });

  it('runs a full refresh cycle successfully and completes the run', async () => {
    // Mock chunk loop to return one active batch, then complete
    mockLongRunningAdminQuery
      .mockResolvedValueOnce({
        rows: [
          {
            seed_count: 5,
            upserted_count: 10,
            next_cursor: 'AA:BB:CC:DD:EE:FF',
          },
        ],
      }) // Loop iteration 1
      .mockResolvedValueOnce({
        rows: [{ seed_count: 0 }],
      }) // Loop iteration 2 (stop)
      .mockResolvedValueOnce({
        rows: [{ count: 15 }],
      }) // Extra rule count query
      .mockResolvedValueOnce({ rows: [] }) // OUI profiles refresh query
      .mockResolvedValueOnce({ rows: [] }) // ANALYZE pairs query
      .mockResolvedValueOnce({ rows: [] }) // ANALYZE networks query
      .mockResolvedValueOnce({ rows: [] }); // MV refresh query

    const options: SiblingRefreshOptions = {
      batchSize: 50,
      incremental: false,
    };

    const res = await orchestrator.runRefreshJob(options);

    expect(res).toEqual({
      success: true,
      batchesRun: 1,
      seedsProcessed: 5,
      rowsUpserted: 10,
      lastCursor: 'AA:BB:CC:DD:EE:FF',
      executionTimeMs: expect.any(Number),
      completed: true,
      sibling_run_id: 1001,
    });

    // Check createRun parameters
    expect(mockSiblingRunRepository.createRun).toHaveBeenCalledWith(
      'full',
      expect.objectContaining({
        batchSize: 50,
        incremental: false,
      })
    );

    // Check query refresh chunk arguments
    expect(mockLongRunningAdminQuery).toHaveBeenCalled();
    const refreshChunkCall = mockLongRunningAdminQuery.mock.calls[0];
    expect(refreshChunkCall[0]).toContain('INSERT INTO app.network_sibling_pairs');
    expect(refreshChunkCall[1]).toEqual([
      50, // batchSize
      null, // cursor
      2, // maxOctetDelta
      50, // maxDistanceM
      0.8, // minCandidateConf
      false, // incremental
      '2026-06-01T00:00:00Z', // cutoff
      1001, // runId
    ]);

    // Check completeRun parameters
    expect(mockSiblingRunRepository.completeRun).toHaveBeenCalledWith(1001, 'completed', {
      seedsProcessed: 5,
      rowsUpserted: 10,
      rowsUpdated: 0,
    });

    // Check final clean-up queries
    const calls = mockLongRunningAdminQuery.mock.calls;
    expect(calls.some((c) => c[0] === 'SELECT app.refresh_oui_sibling_profiles()')).toBe(true);
    expect(calls.some((c) => c[0] === 'ANALYZE app.network_sibling_pairs')).toBe(true);
    expect(calls.some((c) => c[0] === 'ANALYZE app.networks')).toBe(true);
    expect(
      calls.some((c) => c[0] === 'REFRESH MATERIALIZED VIEW CONCURRENTLY app.mv_sibling_groups')
    ).toBe(true);
  });

  it('handles targeted BSSID run and updates notes', async () => {
    const res = await orchestrator.runRefreshJob({
      targetBssids: ['AA:BB:CC:DD:EE:FF'],
      notes: 'Custom notes',
    });

    expect(res.sibling_run_id).toBe(1001);
    expect(mockSiblingRunRepository.createRun).toHaveBeenCalledWith('test', expect.any(Object));

    // Assert update notes query structure
    expect(mockAdminQuery).toHaveBeenCalledWith(
      'UPDATE app.sibling_runs SET notes = $1 WHERE id = $2',
      ['Custom notes', 1001]
    );
  });

  it('stops early if state.cancelRequested is true', async () => {
    mockState.cancelRequested = true;

    const res = await orchestrator.runRefreshJob({});
    expect(res.completed).toBe(false);
    expect(res.batchesRun).toBe(0);

    // Verify completeRun is marked truncated
    expect(mockSiblingRunRepository.completeRun).toHaveBeenCalledWith(
      1001,
      'truncated',
      expect.any(Object)
    );
  });

  it('handles overflow pruning execution correctly', async () => {
    mockSiblingPruningRepository.checkHardwareOverflow.mockResolvedValue([
      { oui: 'AA:BB:CC', ssid: 'Test', node_count: 20 },
    ]);
    mockSiblingPruningRepository.checkSequentialOverflow.mockResolvedValue([
      { component_id: '11:22:33:44:55:66', rule: 'Class A', node_count: 18 },
    ]);

    await orchestrator.runRefreshJob({});

    // Verify pruning calls are triggered on overflow detections
    expect(mockSiblingPruningRepository.pruneHardwareOverflow).toHaveBeenCalled();
    expect(mockSiblingPruningRepository.pruneSequentialOverflow).toHaveBeenCalled();
  });
});

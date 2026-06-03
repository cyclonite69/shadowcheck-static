export {};

const mockAdminQuery = jest.fn();
const mockGetEnrichedCandidates = jest.fn();
const mockBulkUpsertDetections = jest.fn();
const mockScoreSurveillanceCandidates = jest.fn();

jest.mock('../../../../server/src/services/adminDbService', () => ({
  adminQuery: mockAdminQuery,
}));

jest.mock('../../../../server/src/repositories/surveillanceDetectionRepository', () => ({
  getEnrichedCandidates: mockGetEnrichedCandidates,
  bulkUpsertDetections: mockBulkUpsertDetections,
}));

jest.mock('../../../../server/src/services/backgroundJobs/surveillanceScoring', () => ({
  scoreSurveillanceCandidates: mockScoreSurveillanceCandidates,
}));

const {
  runSurveillanceScanJob,
} = require('../../../../server/src/services/backgroundJobs/runners');

beforeEach(() => jest.clearAllMocks());

describe('runSurveillanceScanJob', () => {
  const mockCandidates = [
    { bssid: 'AA:BB:CC:DD:EE:01', device_type: 'FLOCK_SAFETY_CAMERA' },
    { bssid: 'AA:BB:CC:DD:EE:02', device_type: 'AXON_BODY_CAMERA' },
  ];

  const mockScored = [
    {
      bssid: 'AA:BB:CC:DD:EE:01',
      device_type: 'FLOCK_SAFETY_CAMERA',
      confidence: 0.9,
      threat_score: 85,
      detection_method: 'oui_match',
      matched_signals: [],
      false_positive: false,
      fp_reason: null,
    },
    {
      bssid: 'AA:BB:CC:DD:EE:02',
      device_type: 'AXON_BODY_CAMERA',
      confidence: 0.95,
      threat_score: 90,
      detection_method: 'ssid_pattern',
      matched_signals: [],
      false_positive: false,
      fp_reason: null,
    },
  ];

  test('returns detection count, tagged count, and false positive count', async () => {
    mockGetEnrichedCandidates.mockResolvedValue(mockCandidates);
    mockScoreSurveillanceCandidates.mockReturnValue(mockScored);
    mockBulkUpsertDetections.mockResolvedValue(2);
    mockAdminQuery.mockResolvedValue({ rowCount: 2 });

    const result = await runSurveillanceScanJob();

    expect(result.detectionCount).toBe(2);
    expect(result.taggedCount).toBe(2);
    expect(result.falsePositiveCount).toBe(0);
  });

  test('counts false positives correctly', async () => {
    const scoredWithFP = [
      { ...mockScored[0], false_positive: true, fp_reason: 'ClickShare device' },
      { ...mockScored[1], false_positive: false },
    ];
    mockGetEnrichedCandidates.mockResolvedValue(mockCandidates);
    mockScoreSurveillanceCandidates.mockReturnValue(scoredWithFP);
    mockBulkUpsertDetections.mockResolvedValue(2);
    mockAdminQuery.mockResolvedValue({ rowCount: 1 });

    const result = await runSurveillanceScanJob();

    expect(result.falsePositiveCount).toBe(1);
    // FP devices should not be tagged
    expect(result.taggedCount).toBe(1);
  });

  test('skips tagging when all detections are false positives', async () => {
    const allFP = mockScored.map((s) => ({ ...s, false_positive: true }));
    mockGetEnrichedCandidates.mockResolvedValue(mockCandidates);
    mockScoreSurveillanceCandidates.mockReturnValue(allFP);
    mockBulkUpsertDetections.mockResolvedValue(2);
    // adminQuery should only be called for MV refresh, not tagging
    mockAdminQuery.mockResolvedValue({ rowCount: 0 });

    const result = await runSurveillanceScanJob();

    expect(result.taggedCount).toBe(0);
    // adminQuery called only for MV refresh (not for INSERT INTO network_tags)
    const tagInsertCalls = mockAdminQuery.mock.calls.filter(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('network_tags')
    );
    expect(tagInsertCalls).toHaveLength(0);
  });

  test('handles empty candidate set gracefully', async () => {
    mockGetEnrichedCandidates.mockResolvedValue([]);
    mockScoreSurveillanceCandidates.mockReturnValue([]);
    mockBulkUpsertDetections.mockResolvedValue(0);
    mockAdminQuery.mockResolvedValue({ rowCount: 0 });

    const result = await runSurveillanceScanJob();

    expect(result.detectionCount).toBe(0);
    expect(result.taggedCount).toBe(0);
    expect(result.falsePositiveCount).toBe(0);
  });

  test('throws when getEnrichedCandidates fails', async () => {
    mockGetEnrichedCandidates.mockRejectedValue(new Error('DB connection failed'));

    await expect(runSurveillanceScanJob()).rejects.toThrow('DB connection failed');
  });

  test('throws when bulkUpsertDetections fails', async () => {
    mockGetEnrichedCandidates.mockResolvedValue(mockCandidates);
    mockScoreSurveillanceCandidates.mockReturnValue(mockScored);
    mockBulkUpsertDetections.mockRejectedValue(new Error('Upsert failed'));

    await expect(runSurveillanceScanJob()).rejects.toThrow('Upsert failed');
  });

  test('continues (warns) when MV refresh fails', async () => {
    mockGetEnrichedCandidates.mockResolvedValue(mockCandidates);
    mockScoreSurveillanceCandidates.mockReturnValue(mockScored);
    mockBulkUpsertDetections.mockResolvedValue(2);
    // First call = INSERT INTO network_tags (succeeds), second = REFRESH MV (fails)
    mockAdminQuery
      .mockResolvedValueOnce({ rowCount: 2 })
      .mockRejectedValueOnce(new Error('MV refresh failed'));

    // Should NOT throw — MV refresh failure is a warning, not fatal
    const result = await runSurveillanceScanJob();
    expect(result.detectionCount).toBe(2);
  });

  test('passes adminQuery to getEnrichedCandidates', async () => {
    mockGetEnrichedCandidates.mockResolvedValue([]);
    mockScoreSurveillanceCandidates.mockReturnValue([]);
    mockBulkUpsertDetections.mockResolvedValue(0);
    mockAdminQuery.mockResolvedValue({ rowCount: 0 });

    await runSurveillanceScanJob();

    expect(mockGetEnrichedCandidates).toHaveBeenCalledWith(mockAdminQuery);
  });
});

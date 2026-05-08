export {};

// ── forceClearRun (repository) ────────────────────────────────────────────────

const mockAdminQuery = jest.fn();

jest.mock('../../../server/src/config/container', () => ({
  adminDbService: { adminQuery: mockAdminQuery },
}));

jest.mock('../../../server/src/logging/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const { forceClearRun } = require('../../../server/src/repositories/wigleEnrichmentRepository');

const { forceClearEnrichmentRun } = require('../../../server/src/services/wigleEnrichmentService');

beforeEach(() => jest.clearAllMocks());

describe('wigleEnrichmentRepository.forceClearRun', () => {
  test('issues UPDATE setting status=failed for the given runId', async () => {
    mockAdminQuery.mockResolvedValue({ rowCount: 1 });
    await forceClearRun(116);
    const [sql, params] = mockAdminQuery.mock.calls[0];
    expect(sql).toContain("status = 'failed'");
    expect(sql).toContain('WHERE id = $1');
    expect(sql).toContain("status = 'running'");
    expect(params).toEqual([116]);
  });

  test('returns true when a running row was updated', async () => {
    mockAdminQuery.mockResolvedValue({ rowCount: 1 });
    expect(await forceClearRun(116)).toBe(true);
  });

  test('returns false when no running row matched (already finished)', async () => {
    mockAdminQuery.mockResolvedValue({ rowCount: 0 });
    expect(await forceClearRun(999)).toBe(false);
  });

  test('returns false when rowCount is null', async () => {
    mockAdminQuery.mockResolvedValue({ rowCount: null });
    expect(await forceClearRun(1)).toBe(false);
  });

  test('propagates DB errors', async () => {
    mockAdminQuery.mockRejectedValue(new Error('DB error'));
    await expect(forceClearRun(1)).rejects.toThrow('DB error');
  });
});

// ── forceClearEnrichmentRun (service) ────────────────────────────────────────

describe('wigleEnrichmentService.forceClearEnrichmentRun', () => {
  test('returns { cleared: true } when repository clears the run', async () => {
    mockAdminQuery.mockResolvedValue({ rowCount: 1 });
    const result = await forceClearEnrichmentRun(116);
    expect(result).toEqual({ cleared: true });
  });

  test('returns { cleared: false } when run was not in running state', async () => {
    mockAdminQuery.mockResolvedValue({ rowCount: 0 });
    const result = await forceClearEnrichmentRun(999);
    expect(result).toEqual({ cleared: false });
  });

  test('propagates DB errors', async () => {
    mockAdminQuery.mockRejectedValue(new Error('DB error'));
    await expect(forceClearEnrichmentRun(1)).rejects.toThrow('DB error');
  });
});

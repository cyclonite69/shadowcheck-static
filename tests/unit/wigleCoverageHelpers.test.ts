export {};

import {
  buildCoverageTerms,
  getCoverageCountDisplay,
  getCoverageRemoteDisplay,
  mergeCoverageStates,
} from '../../client/src/components/admin/hooks/wigleCoverageHelpers';
import { US_STATES } from '../../client/src/constants/network';
import type { WigleImportRun } from '../../client/src/types/admin';

function makeRun(
  overrides: Partial<WigleImportRun> & { searchTerm: string; startedAt: string }
): WigleImportRun {
  return {
    id: 1,
    source: 'wigle',
    apiVersion: 'v2',
    requestFingerprint: 'fp',
    requestParams: {},
    status: 'completed',
    lastSuccessfulPage: 0,
    nextPage: 0,
    pagesFetched: 0,
    rowsReturned: 0,
    rowsInserted: 0,
    pageSize: 100,
    ...overrides,
  };
}

describe('buildCoverageTerms', () => {
  test('dedupes terms case-insensitively', () => {
    const runs = [
      makeRun({ searchTerm: 'FBI', startedAt: '2024-01-01T00:00:00Z' }),
      makeRun({ searchTerm: 'fbi', startedAt: '2024-01-02T00:00:00Z' }),
      makeRun({ searchTerm: 'FBi', startedAt: '2024-01-03T00:00:00Z' }),
    ];
    expect(buildCoverageTerms(runs)).toHaveLength(1);
  });

  test('most recent run casing wins when duplicates differ by case', () => {
    const runs = [
      makeRun({ id: 1, searchTerm: 'FBI', startedAt: '2024-01-01T00:00:00Z' }),
      makeRun({ id: 2, searchTerm: 'fbi', startedAt: '2024-01-02T00:00:00Z' }),
      makeRun({ id: 3, searchTerm: 'FBi', startedAt: '2024-01-03T00:00:00Z' }),
    ];
    expect(buildCoverageTerms(runs)[0]).toBe('FBi');
  });

  test('sorts terms deterministically (localeCompare ascending)', () => {
    const runs = [
      makeRun({ searchTerm: 'zoo', startedAt: '2024-01-01T00:00:00Z' }),
      makeRun({ searchTerm: 'apple', startedAt: '2024-01-01T00:00:00Z' }),
      makeRun({ searchTerm: 'mango', startedAt: '2024-01-01T00:00:00Z' }),
    ];
    expect(buildCoverageTerms(runs)).toEqual(['apple', 'mango', 'zoo']);
  });

  test('returns empty array for empty runs list', () => {
    expect(buildCoverageTerms([])).toEqual([]);
  });

  test('skips runs with falsy searchTerm', () => {
    const runs = [
      makeRun({ searchTerm: '', startedAt: '2024-01-01T00:00:00Z' }),
      makeRun({ searchTerm: 'valid', startedAt: '2024-01-01T00:00:00Z' }),
    ];
    expect(buildCoverageTerms(runs)).toEqual(['valid']);
  });

  test('no .slice(0,20) — returns all distinct terms beyond 20', () => {
    const runs = Array.from({ length: 25 }, (_, i) =>
      makeRun({
        searchTerm: `term${i.toString().padStart(2, '0')}`,
        startedAt: '2024-01-01T00:00:00Z',
      })
    );
    expect(buildCoverageTerms(runs)).toHaveLength(25);
  });
});

describe('mergeCoverageStates', () => {
  test('renders all 56 US_STATES entries', () => {
    const result = mergeCoverageStates([], US_STATES);
    expect(result).toHaveLength(56);
    expect(result.map((r) => r.state)).toEqual(US_STATES.map((s) => s.code));
  });

  test('queried states carry backend values and isQueried=true', () => {
    const reportStates = [
      {
        state: 'CA',
        localRows: 1100,
        localUniqueBssids: 1000,
        rowsInserted: 1234,
        runId: 42,
        status: 'completed',
        lastError: null,
      },
    ];
    const result = mergeCoverageStates(reportStates, US_STATES);
    const ca = result.find((r) => r.state === 'CA')!;
    expect(ca.isQueried).toBe(true);
    expect(ca.localRows).toBe(1100);
    expect(ca.localUniqueBssids).toBe(1000);
    expect(ca.rowsInserted).toBe(1234);
    expect(ca.runId).toBe(42);
    expect(ca.status).toBe('completed');
  });

  test('backend state matching is case-insensitive (lowercase state code)', () => {
    const result = mergeCoverageStates(
      [
        {
          state: 'ca',
          localRows: 80,
          localUniqueBssids: 75,
          rowsInserted: 99,
          runId: 1,
          status: 'completed',
          lastError: null,
        },
      ],
      US_STATES
    );
    const ca = result.find((r) => r.state === 'CA')!;
    expect(ca.isQueried).toBe(true);
    expect(ca.localUniqueBssids).toBe(75);
    expect(ca.rowsInserted).toBe(99);
  });

  test('unqueried supported jurisdictions render with zero local counts', () => {
    const result = mergeCoverageStates(
      [
        {
          state: 'TX',
          localRows: 450,
          localUniqueBssids: 425,
          rowsInserted: 500,
          runId: 7,
          status: 'completed',
          lastError: null,
        },
      ],
      US_STATES
    );
    const unqueried = result.filter((r) => r.state !== 'TX' && r.probeStatus === 'supported');
    expect(unqueried.every((r) => !r.isQueried)).toBe(true);
    expect(unqueried.every((r) => r.localRows === 0)).toBe(true);
    expect(unqueried.every((r) => r.localUniqueBssids === 0)).toBe(true);
  });

  test('null reportStates leaves all supported jurisdictions with zero local counts', () => {
    const result = mergeCoverageStates(null, US_STATES);
    expect(result.every((r) => !r.isQueried)).toBe(true);
    expect(
      result.filter((r) => r.probeStatus === 'supported').every((r) => r.localRows === 0)
    ).toBe(true);
  });

  test('keeps Puerto Rico on the normal supported path', () => {
    const result = mergeCoverageStates(null, US_STATES);
    expect(result.find((r) => r.state === 'PR')).toEqual(
      expect.objectContaining({
        probeStatus: 'supported',
        localRows: 0,
        localUniqueBssids: 0,
        isQueried: false,
      })
    );
  });

  test('marks unverified territories without implying zero-result coverage', () => {
    const result = mergeCoverageStates(null, US_STATES);
    const unverified = result.filter((r) => ['AS', 'GU', 'MP', 'VI'].includes(r.state));

    expect(unverified).toHaveLength(4);
    expect(unverified.every((r) => r.probeStatus === 'unverified')).toBe(true);
    expect(unverified.every((r) => r.rowsInserted === null)).toBe(true);
    expect(unverified.every((r) => !r.isQueried)).toBe(true);
  });

  test('uses local unique BSSIDs when local data exists without an import run', () => {
    const [ca] = mergeCoverageStates(
      [
        {
          state: 'CA',
          localRows: 2104,
          localUniqueBssids: 2100,
          rowsInserted: null,
          runId: null,
          status: null,
        },
      ],
      [{ code: 'CA', name: 'California' }]
    );

    expect(ca.isQueried).toBe(false);
    expect(ca.hasLocalData).toBe(true);
    expect(getCoverageCountDisplay(ca)).toEqual({
      value: 2100,
      label: 'Local BSSIDs',
    });
  });

  test('does not use rowsInserted as the displayed local coverage count', () => {
    const [tx] = mergeCoverageStates(
      [
        {
          state: 'TX',
          localRows: 12,
          localUniqueBssids: 10,
          rowsInserted: 500,
          runId: 7,
          status: 'completed',
        },
      ],
      [{ code: 'TX', name: 'Texas' }]
    );

    expect(getCoverageCountDisplay(tx)).toEqual({ value: 10, label: 'Local BSSIDs' });
  });

  test('displays known availability and gap separately from the local count', () => {
    const [ca] = mergeCoverageStates(
      [
        {
          state: 'CA',
          localRows: 90,
          localUniqueBssids: 80,
          knownRemoteAvailable: 100,
          gap: 20,
          ledgerStatus: 'known',
          lastLedgerProbeAt: '2026-06-19T12:00:00.000Z',
        },
      ],
      [{ code: 'CA', name: 'California' }]
    );

    expect(getCoverageCountDisplay(ca)).toEqual({ value: 80, label: 'Local BSSIDs' });
    expect(getCoverageRemoteDisplay(ca)).toEqual({
      availabilityLabel: 'Known available: 100',
      gapLabel: 'Gap: 20',
      statusLabel: null,
    });
  });

  test('shows remote availability as unknown when no durable total exists', () => {
    const [tx] = mergeCoverageStates(
      [
        {
          state: 'TX',
          localRows: 12,
          localUniqueBssids: 10,
          knownRemoteAvailable: null,
          gap: null,
          ledgerStatus: 'unknown',
          lastLedgerResultCount: 100,
        },
      ],
      [{ code: 'TX', name: 'Texas' }]
    );

    expect(getCoverageRemoteDisplay(tx)).toEqual({
      availabilityLabel: 'Remote unknown',
      gapLabel: null,
      statusLabel: null,
    });
  });

  test.each([
    ['rate_limited', 'Rate limited'],
    ['error', 'Last probe failed'],
  ] as const)('surfaces %s ledger state', (ledgerStatus, statusLabel) => {
    const [row] = mergeCoverageStates(
      [{ state: 'CA', ledgerStatus }],
      [{ code: 'CA', name: 'California' }]
    );

    expect(getCoverageRemoteDisplay(row).statusLabel).toBe(statusLabel);
  });

  test('keeps unverified territory display inactive even if local counts are returned', () => {
    const [americanSamoa] = mergeCoverageStates(
      [{ state: 'AS', localRows: 4, localUniqueBssids: 3 }],
      [{ code: 'AS', name: 'American Samoa', probeStatus: 'unverified' }]
    );

    expect(getCoverageCountDisplay(americanSamoa)).toEqual({
      value: null,
      label: 'Not auto-probed',
    });
    expect(getCoverageRemoteDisplay(americanSamoa)).toEqual({
      availabilityLabel: 'Remote not auto-probed',
      gapLabel: null,
      statusLabel: null,
    });
  });
});

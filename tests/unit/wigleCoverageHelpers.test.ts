export {};

import {
  buildCoverageTerms,
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
      { state: 'CA', rowsInserted: 1234, runId: 42, status: 'completed', lastError: null },
    ];
    const result = mergeCoverageStates(reportStates, US_STATES);
    const ca = result.find((r) => r.state === 'CA')!;
    expect(ca.isQueried).toBe(true);
    expect(ca.rowsInserted).toBe(1234);
    expect(ca.runId).toBe(42);
    expect(ca.status).toBe('completed');
  });

  test('backend state matching is case-insensitive (lowercase state code)', () => {
    const result = mergeCoverageStates(
      [{ state: 'ca', rowsInserted: 99, runId: 1, status: 'completed', lastError: null }],
      US_STATES
    );
    const ca = result.find((r) => r.state === 'CA')!;
    expect(ca.isQueried).toBe(true);
    expect(ca.rowsInserted).toBe(99);
  });

  test('unqueried states render as isQueried=false with zero rowsInserted', () => {
    const result = mergeCoverageStates(
      [{ state: 'TX', rowsInserted: 500, runId: 7, status: 'completed', lastError: null }],
      US_STATES
    );
    const unqueried = result.filter((r) => r.state !== 'TX');
    expect(unqueried.every((r) => !r.isQueried)).toBe(true);
    expect(unqueried.every((r) => r.rowsInserted === 0)).toBe(true);
  });

  test('null reportStates renders all states as unqueried with zero rows', () => {
    const result = mergeCoverageStates(null, US_STATES);
    expect(result.every((r) => !r.isQueried)).toBe(true);
    expect(result.every((r) => r.rowsInserted === 0)).toBe(true);
  });
});

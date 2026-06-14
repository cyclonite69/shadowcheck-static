import type { WigleImportRun } from '../../../types/admin';

export interface CoverageStateRow {
  state: string;
  name: string;
  rowsInserted: number;
  runId: number | null;
  status: string | null;
  lastError: string | null;
  isQueried: boolean;
}

export interface ReportStateEntry {
  state?: string | null;
  rowsInserted?: number | null;
  runId?: number | null;
  status?: string | null;
  lastError?: string | null;
}

/**
 * Derives a deduplicated, case-insensitively-keyed, sorted list of coverage
 * search terms from import runs.
 *
 * When the same term exists under multiple casings, the casing from the
 * most-recently-started run wins.
 */
export function buildCoverageTerms(runs: WigleImportRun[]): string[] {
  const termsMap = new Map<string, { term: string; startedAtTime: number }>();
  for (const r of runs) {
    const term = r.searchTerm;
    if (!term) continue;
    const lower = term.toLowerCase();
    const startedAtTime = r.startedAt ? new Date(r.startedAt).getTime() : 0;
    const existing = termsMap.get(lower);
    if (!existing || startedAtTime > existing.startedAtTime) {
      termsMap.set(lower, { term, startedAtTime });
    }
  }
  return Array.from(termsMap.values())
    .map((item) => item.term)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Merges backend per-state report data with the canonical US_STATES list.
 * States present in the backend report are marked isQueried=true and carry
 * their backend values. All remaining US_STATES entries render with
 * isQueried=false and zero rows.
 */
export function mergeCoverageStates(
  reportStates: ReportStateEntry[] | null | undefined,
  usStates: Array<{ code: string; name: string }>
): CoverageStateRow[] {
  const reportStatesMap = new Map<string, ReportStateEntry>();
  if (reportStates) {
    for (const s of reportStates) {
      if (s.state) {
        reportStatesMap.set(s.state.toUpperCase(), s);
      }
    }
  }
  return usStates.map((stateObj) => {
    const code = stateObj.code.toUpperCase();
    const matched = reportStatesMap.get(code);
    return {
      state: stateObj.code,
      name: stateObj.name,
      rowsInserted: matched ? (matched.rowsInserted ?? 0) : 0,
      runId: matched ? (matched.runId ?? null) : null,
      status: matched ? (matched.status ?? null) : null,
      lastError: matched ? (matched.lastError ?? null) : null,
      isQueried: !!matched,
    };
  });
}

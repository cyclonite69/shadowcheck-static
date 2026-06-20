import type { WigleImportRun } from '../../../types/admin';
import type { JurisdictionProbeStatus } from '../../../constants/network';

export interface CoverageStateRow {
  state: string;
  name: string;
  rowsInserted: number | null;
  runId: number | null;
  status: string | null;
  lastError: string | null;
  isQueried: boolean;
  probeStatus: JurisdictionProbeStatus;
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
 * their backend values. Supported entries without report data render with
 * zero rows. Unverified territories render with a null count so the UI does
 * not imply that an automatic probe failed or returned zero results.
 */
export function mergeCoverageStates(
  reportStates: ReportStateEntry[] | null | undefined,
  usStates: Array<{
    code: string;
    name: string;
    probeStatus?: JurisdictionProbeStatus;
  }>
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
    const probeStatus = stateObj.probeStatus ?? 'supported';
    return {
      state: stateObj.code,
      name: stateObj.name,
      rowsInserted: matched ? (matched.rowsInserted ?? 0) : probeStatus === 'unverified' ? null : 0,
      runId: matched ? (matched.runId ?? null) : null,
      status: matched ? (matched.status ?? null) : null,
      lastError: matched ? (matched.lastError ?? null) : null,
      isQueried: !!matched,
      probeStatus,
    };
  });
}

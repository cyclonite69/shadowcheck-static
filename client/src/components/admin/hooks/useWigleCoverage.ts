import { useEffect, useMemo, useState } from 'react';
import { wigleApi } from '../../../api/wigleApi';
import type { WigleImportRun } from '../../../types/admin';
import type { WigleCompletenessReport } from './useWigleRuns';

export interface UseWigleCoverageOptions {
  runs: WigleImportRun[];
}

export interface UseWigleCoverageResult {
  coverageTerms: string[];
  coverageTerm: string;
  setCoverageTerm: React.Dispatch<React.SetStateAction<string>>;
  termReport: WigleCompletenessReport | null;
  termReportLoading: boolean;
}

export const useWigleCoverage = ({ runs }: UseWigleCoverageOptions): UseWigleCoverageResult => {
  const coverageTerms = useMemo(() => {
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
  }, [runs]);

  const [coverageTerm, setCoverageTerm] = useState<string>('');
  const [termReport, setTermReport] = useState<WigleCompletenessReport | null>(null);
  const [termReportLoading, setTermReportLoading] = useState(false);

  // Auto-select first available term
  useEffect(() => {
    if (!coverageTerm && coverageTerms.length > 0) {
      setCoverageTerm(coverageTerms[0]);
    }
  }, [coverageTerms, coverageTerm]);

  // Re-fetch coverage when selected term changes
  useEffect(() => {
    if (!coverageTerm) return;
    setTermReportLoading(true);
    wigleApi
      .getImportCompletenessReport(new URLSearchParams({ searchTerm: coverageTerm }))
      .then((data) => setTermReport(data?.report || null))
      .catch(() => setTermReport(null))
      .finally(() => setTermReportLoading(false));
  }, [coverageTerm]);

  return {
    coverageTerms,
    coverageTerm,
    setCoverageTerm,
    termReport,
    termReportLoading,
  };
};

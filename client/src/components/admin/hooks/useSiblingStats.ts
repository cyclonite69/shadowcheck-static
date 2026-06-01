import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../../../api/client';

export interface SiblingStats {
  total_pairs: number;
  strong_pairs: number;
  candidate_pairs: number;
  avg_confidence: string;
  oldest_computed_at: string | null;
  newest_computed_at: string | null;
}

export interface SiblingByRule {
  rule: string;
  pair_count: number;
  avg_confidence: string;
  last_run_at: string | null;
}

export interface UseSiblingStatsReturn {
  siblingStats: SiblingStats | null;
  siblingByRule: SiblingByRule[];
  purgingSiblings: boolean;
  loadingSiblings: boolean;
  fetchSiblingStats: () => Promise<void>;
  purgeSiblings: () => Promise<void>;
}

export const useSiblingStats = (onPurgeComplete?: () => Promise<void>): UseSiblingStatsReturn => {
  const [siblingStats, setSiblingStats] = useState<SiblingStats | null>(null);
  const [siblingByRule, setSiblingByRule] = useState<SiblingByRule[]>([]);
  const [purgingSiblings, setPurgingSiblings] = useState<boolean>(false);
  const [loadingSiblings, setLoadingSiblings] = useState<boolean>(true);

  const fetchSiblingStats = useCallback(async () => {
    try {
      setLoadingSiblings(true);
      const response = await apiClient.get<{
        ok: boolean;
        stats: SiblingStats;
        byRule: SiblingByRule[];
      }>('/admin/siblings/stats');
      if (response.ok) {
        setSiblingStats(response.stats);
        setSiblingByRule(response.byRule);
      }
    } catch (err) {
      // Intentionally ignored, mirroring original behavior
    } finally {
      setLoadingSiblings(false);
    }
  }, []);

  useEffect(() => {
    fetchSiblingStats();
  }, [fetchSiblingStats]);

  const purgeSiblings = async () => {
    if (!window.confirm('Purge all sibling pairs and start a full redetect now?')) return;
    setPurgingSiblings(true);
    try {
      await apiClient.delete('/admin/siblings/pairs');
      setSiblingStats(null);
      setSiblingByRule([]);
      // Trigger full redetect immediately after purge
      await apiClient.post('/admin/siblings/refresh', {});
      await fetchSiblingStats();
      if (onPurgeComplete) {
        await onPurgeComplete();
      }
    } catch (err: any) {
      window.alert(`Purge/redetect failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setPurgingSiblings(false);
    }
  };

  return {
    siblingStats,
    siblingByRule,
    purgingSiblings,
    loadingSiblings,
    fetchSiblingStats,
    purgeSiblings,
  };
};

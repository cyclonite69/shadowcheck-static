import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../../../api/client';

export interface TableStat {
  table_name: string;
  row_count: string;
  size_bytes: string;
  size_pretty: string;
  total_inserts: string;
  total_updates: string;
  total_deletes: string;
  last_active: string | null;
  index_reads: string;
  sequential_reads: string;
}

export interface MVStat {
  view_name: string;
  is_populated: boolean;
  size_pretty: string;
  seq_scan: string;
  seq_tup_read: string;
  last_active: string | null;
}

export interface UnusedIndex {
  table_name: string;
  index_name: string;
  scan_count: string;
  size_pretty: string;
  size_bytes: string;
}

export interface UnusedIndexSummary {
  count: number;
  total_mb: number;
}

export interface DbStats {
  total_db_size: string;
  stats_reset: string | null;
  tables: TableStat[];
  categories: Record<string, string[]>;
  materialized_views: MVStat[];
  unused_indexes: UnusedIndex[];
  unused_indexes_summary?: UnusedIndexSummary;
}

export interface UseDbStatsReturn {
  stats: DbStats | null;
  loading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
}

export const useDbStats = (): UseDbStatsReturn => {
  const [stats, setStats] = useState<DbStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<DbStats>('/admin/db-stats');
      setStats(response);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch DB stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, fetchStats };
};

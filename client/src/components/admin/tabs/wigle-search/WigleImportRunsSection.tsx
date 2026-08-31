import React from 'react';
import { WigleRunsCard } from '../../components/WigleRunsCard';
import { wigleApi } from '../../../../api/wigleApi';
import type { WigleRun } from '../../../../types';
import type { SortState } from '../../hooks/useWigleRuns';

export interface WigleImportRunsSectionProps {
  runs: WigleRun[];
  runsLoading: boolean;
  actionLoading: string | null;
  runsError: string | null;
  runsSortCols: SortState[];
  setRunsSortCols: React.Dispatch<React.SetStateAction<SortState[]>>;
  refreshRuns: () => Promise<void>;
  resumeRun: (runId: string) => Promise<void>;
  pauseRun: (runId: string) => Promise<void>;
  cancelRun: (runId: string) => Promise<void>;
  deleteRun: (runId: string) => Promise<void>;
}

export const WigleImportRunsSection: React.FC<WigleImportRunsSectionProps> = ({
  runs,
  runsLoading,
  actionLoading,
  runsError,
  runsSortCols,
  setRunsSortCols,
  refreshRuns,
  resumeRun,
  pauseRun,
  cancelRun,
  deleteRun,
}) => {
  return (
    <WigleRunsCard
      runs={runs}
      loading={runsLoading}
      actionLoading={actionLoading}
      error={runsError}
      sortCols={runsSortCols}
      onSort={(col, e) => {
        if (!col.sortKey) return;
        setRunsSortCols((prev) => {
          const existing = prev.find((s) => s.key === col.sortKey);
          if (e.shiftKey) {
            if (existing) {
              return prev.map((s) =>
                s.key === col.sortKey ? { ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' } : s
              );
            }
            return [...prev, { key: col.sortKey!, dir: 'asc' }];
          }
          if (existing && prev.length === 1) {
            return [{ key: col.sortKey!, dir: existing.dir === 'asc' ? 'desc' : 'asc' }];
          }
          return [{ key: col.sortKey!, dir: 'asc' }];
        });
      }}
      onRefresh={refreshRuns}
      onResume={resumeRun}
      onPause={pauseRun}
      onCancel={cancelRun}
      onDelete={deleteRun}
      onCleanupCluster={async () => {
        await wigleApi.cleanupCancelledCluster();
        await refreshRuns();
      }}
    />
  );
};

import React from 'react';
import type { CourthouseMatch } from '../hooks/useNearestCourthouses';

interface NearestCourthousesPanelProps {
  courthouses: CourthouseMatch[];
  loading: boolean;
  error: string;
  networkCount?: number;
}

const PANEL_STYLE: React.CSSProperties = {
  position: 'fixed',
  top: '120px',
  right: '80px',
  background: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgb(100, 116, 139)',
  borderRadius: '12px',
  padding: '16px',
  minWidth: '320px',
  maxWidth: '400px',
  maxHeight: '500px',
  zIndex: 1000,
  backdropFilter: 'blur(8px)',
};

const COURTHOUSE_TYPE_LABEL: Record<string, string> = {
  district_court: '⚖️ District Court',
  circuit_court_of_appeals: '🏛️ Circuit Court of Appeals',
  bankruptcy_court: '📋 Bankruptcy Court',
  magistrate_court: '🔨 Magistrate Court',
  specialty_court: '🔍 Specialty Court',
};

function sourceLabel(ch: CourthouseMatch): string {
  if (ch.has_wigle_obs && ch.has_local_obs) return 'mixed';
  if (ch.has_wigle_obs) return 'WiGLE';
  return 'local';
}

export const NearestCourthousesPanel: React.FC<NearestCourthousesPanelProps> = ({
  courthouses,
  loading,
  error,
  networkCount = 1,
}) => {
  if (courthouses.length === 0 && !loading && !error) {
    if (networkCount === 0) {
      return (
        <div style={{ ...PANEL_STYLE, maxHeight: undefined, top: '420px' }}>
          <h2 className="text-lg font-semibold mb-2">Nearest Courthouses</h2>
          <p className="text-sm text-slate-500">Select networks to find nearby courthouses</p>
        </div>
      );
    }
    return null;
  }

  const hasClusters = courthouses.some((c) => c.cluster_id != null);

  const clusterMap = new Map<number | 'single', CourthouseMatch[]>();
  if (hasClusters) {
    for (const ch of courthouses) {
      const key = ch.cluster_id ?? 0;
      if (!clusterMap.has(key)) clusterMap.set(key, []);
      clusterMap.get(key)!.push(ch);
    }
  } else {
    clusterMap.set('single', courthouses);
  }

  const clusterEntries = Array.from(clusterMap.entries());

  return (
    <div style={{ ...PANEL_STYLE, top: '420px' }}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Nearest Courthouses</h2>
        {hasClusters && clusterEntries.length > 1 && (
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400">
            {clusterEntries.length} clusters
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-3">
        {networkCount > 1
          ? `Nearest courthouse per observation cluster across ${networkCount} selected networks`
          : 'Nearest courthouse to observation points'}
      </p>

      {loading && <p className="text-slate-400 text-sm">Loading...</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="space-y-3 max-h-80 overflow-auto">
        {clusterEntries.map(([clusterId, clusterCourthouses], clusterIdx) => (
          <div key={String(clusterId)}>
            {hasClusters && clusterEntries.length > 1 && (
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Cluster {clusterIdx + 1}
                </span>
                <span className="text-xs text-slate-600">
                  {clusterCourthouses[0]?.cluster_count ?? '?'} obs ·{' '}
                  {sourceLabel(clusterCourthouses[0])}
                </span>
              </div>
            )}

            {clusterCourthouses.map((ch, idx) => (
              <div key={idx} className="p-3 rounded border bg-slate-800/70 border-slate-800">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-slate-200">
                      {ch.short_name || ch.name}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {COURTHOUSE_TYPE_LABEL[ch.courthouse_type] ?? ch.courthouse_type}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{ch.district}</div>
                    <div className="text-xs text-slate-500">
                      {ch.city}, {ch.state} {ch.postal_code}
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-sm font-semibold text-amber-400">
                      {((ch.distance_meters || 0) / 1000).toFixed(1)} km
                    </div>
                    {ch.has_wigle_obs && (
                      <div className="text-xs text-red-400 mt-1">WiGLE data</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {courthouses.length === 0 && !loading && !error && (
          <p className="text-slate-500 text-sm">No courthouses found nearby</p>
        )}
      </div>
    </div>
  );
};

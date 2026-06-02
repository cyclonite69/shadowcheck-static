import React from 'react';
import type { Agency } from '../hooks/useNearestAgencies';

interface NearestAgenciesPanelProps {
  agencies: Agency[];
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

function sourceLabel(agency: Agency): string {
  if (agency.has_wigle_obs && agency.has_local_obs) return 'mixed';
  if (agency.has_wigle_obs) return 'WiGLE';
  return 'local';
}

export const NearestAgenciesPanel: React.FC<NearestAgenciesPanelProps> = ({
  agencies,
  loading,
  error,
  networkCount = 1,
}) => {
  // Empty / no selection state
  if (agencies.length === 0 && !loading && !error) {
    if (networkCount === 0) {
      return (
        <div style={{ ...PANEL_STYLE, maxHeight: undefined }}>
          <h2 className="text-lg font-semibold mb-2">Nearest Agencies</h2>
          <p className="text-sm text-slate-500">Select networks to find nearby agencies</p>
        </div>
      );
    }
    return null;
  }

  // Determine if cluster context is available (batch path returns cluster_id)
  const hasClusters = agencies.some((a) => a.cluster_id != null);

  // Group by cluster_id when available, otherwise treat all as one group
  const clusterMap = new Map<number | 'single', Agency[]>();
  if (hasClusters) {
    for (const agency of agencies) {
      const key = agency.cluster_id ?? 0;
      if (!clusterMap.has(key)) clusterMap.set(key, []);
      clusterMap.get(key)!.push(agency);
    }
  } else {
    clusterMap.set('single', agencies);
  }

  const clusterEntries = Array.from(clusterMap.entries());

  return (
    <div style={PANEL_STYLE}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Nearest Agencies</h2>
        {hasClusters && clusterEntries.length > 1 && (
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400">
            {clusterEntries.length} clusters
          </span>
        )}
        {!hasClusters && agencies.length > 0 && (
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400">
            {agencies.length} unique
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-3">
        {networkCount > 1
          ? `Nearest agency per observation cluster across ${networkCount} selected networks`
          : 'Nearest agencies to observation points'}
      </p>

      {loading && <p className="text-slate-400 text-sm">Loading...</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="space-y-3 max-h-80 overflow-auto">
        {clusterEntries.map(([clusterId, clusterAgencies], clusterIdx) => (
          <div key={String(clusterId)}>
            {/* Cluster header — only shown when multiple clusters exist */}
            {hasClusters && clusterEntries.length > 1 && (
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Cluster {clusterIdx + 1}
                </span>
                <span className="text-xs text-slate-600">
                  {clusterAgencies[0]?.cluster_count ?? '?'} obs · {sourceLabel(clusterAgencies[0])}
                </span>
              </div>
            )}

            {clusterAgencies.map((agency, idx) => (
              <div
                key={idx}
                className={`p-3 rounded border ${
                  agency.has_wigle_obs
                    ? 'bg-red-900/20 border-red-800/50'
                    : 'bg-slate-800/70 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-slate-200">{agency.name}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {agency.office_type === 'field_office'
                        ? '🏢 Field Office'
                        : '📍 Resident Agency'}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {agency.city}, {agency.state} {agency.postal_code}
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-sm font-semibold text-blue-400">
                      {((agency.distance_meters || 0) / 1000).toFixed(1)} km
                    </div>
                    {agency.has_wigle_obs && (
                      <div className="text-xs text-red-400 mt-1">WiGLE data</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {agencies.length === 0 && !loading && !error && (
          <p className="text-slate-500 text-sm">No agencies found nearby</p>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { AnalyticsData } from '../../hooks/useAnalyticsData';
import { isValidChartData } from '../../utils/chartHelpers';

interface Props {
  data: AnalyticsData;
  renderEmptyState: (message?: string) => React.ReactElement;
}

export const TopNetworksList: React.FC<Props> = ({ data, renderEmptyState }) => {
  if (!isValidChartData(data.topNetworks)) return renderEmptyState();
  return (
    <div className="h-[260px] overflow-y-auto space-y-2">
      {data.topNetworks.map((network, idx) => (
        <div
          key={idx}
          className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/20 flex justify-between items-center hover:bg-slate-800/40 transition-colors"
        >
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-slate-300 font-mono truncate">
              {network.bssid}
            </div>
            <div className="text-xs text-slate-400 mt-0.5 truncate">{network.ssid}</div>
          </div>
          <div className="text-sm font-semibold text-blue-400 ml-3">
            {Number.isFinite(network.observations) ? network.observations.toLocaleString() : 'N/A'}
          </div>
        </div>
      ))}
    </div>
  );
};

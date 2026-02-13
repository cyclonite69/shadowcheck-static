// ===== FILE: src/components/analytics/components/AnalyticsCharts.tsx =====
// PURPOSE: Dispatcher that renders the appropriate chart component based on card type

import React from 'react';
import { Card } from '../hooks/useCardLayout';
import { AnalyticsData } from '../hooks/useAnalyticsData';
import { NetworkTypesChart } from './charts/NetworkTypesChart';
import { SignalChart } from './charts/SignalChart';
import { SecurityChart } from './charts/SecurityChart';
import { TemporalChart } from './charts/TemporalChart';
import { RadioTimeChart } from './charts/RadioTimeChart';
import { ThreatDistributionChart } from './charts/ThreatDistributionChart';
import { ThreatTrendsChart } from './charts/ThreatTrendsChart';
import { TopNetworksList } from './charts/TopNetworksList';
import { SeverityCountsChart } from './charts/SeverityCountsChart';

interface AnalyticsChartsProps {
  card: Card;
  data: AnalyticsData;
  loading: boolean;
  error: string | null;
  debouncedFilterState: any;
  onMouseDown: (e: React.MouseEvent, cardId: number, mode?: 'move' | 'resize') => void;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  card,
  data,
  loading,
  error,
  debouncedFilterState,
}) => {
  if (loading && [1, 2, 3, 4, 8].includes(card.id)) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-slate-200" />
          Loading analytics...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full px-4">
        <div className="w-full rounded-lg border border-red-500/40 bg-red-900/20 px-3 py-2 text-center text-xs text-red-200">
          {error}
        </div>
      </div>
    );
  }

  const renderEmptyState = (message = 'No data available') => {
    const isAllTime = !debouncedFilterState?.enabled?.timeframe;
    const fullMessage = isAllTime ? `${message} (all time)` : message;
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-xs">
        {fullMessage}
      </div>
    );
  };

  switch (card.type) {
    case 'network-types':
      return (
        <NetworkTypesChart
          data={data}
          debouncedFilterState={debouncedFilterState}
          renderEmptyState={renderEmptyState}
        />
      );
    case 'signal':
      return <SignalChart data={data} renderEmptyState={renderEmptyState} />;
    case 'security':
      return (
        <SecurityChart
          data={data}
          debouncedFilterState={debouncedFilterState}
          renderEmptyState={renderEmptyState}
        />
      );
    case 'temporal':
      return <TemporalChart data={data} renderEmptyState={renderEmptyState} />;
    case 'radio-time':
      return <RadioTimeChart data={data} renderEmptyState={renderEmptyState} />;
    case 'threat-distribution':
      return <ThreatDistributionChart data={data} renderEmptyState={renderEmptyState} />;
    case 'threat-trends':
      return <ThreatTrendsChart data={data} renderEmptyState={renderEmptyState} />;
    case 'top-networks':
      return <TopNetworksList data={data} renderEmptyState={renderEmptyState} />;
    case 'severity-counts':
      return <SeverityCountsChart data={data} renderEmptyState={renderEmptyState} />;
    default:
      return null;
  }
};

// ===== END FILE =====

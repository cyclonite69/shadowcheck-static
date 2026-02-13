import React from 'react';
import { AnalyticsData } from '../../hooks/useAnalyticsData';
import { CHART_COLORS } from '../../utils/chartConfig';
import { PieChartWithLegend } from './PieChartWithLegend';

interface Props {
  data: AnalyticsData;
  renderEmptyState: (message?: string) => React.ReactElement;
}

export const SeverityCountsChart: React.FC<Props> = ({ data, renderEmptyState }) => {
  if (
    !data.severityCounts ||
    data.severityCounts.length === 0 ||
    !data.severityCounts.some((i) => i.value > 0)
  ) {
    return renderEmptyState();
  }
  return (
    <PieChartWithLegend
      data={data.severityCounts.map((item) => ({
        name: item.name,
        value: item.value,
        color: CHART_COLORS.severity[item.severity] || '#94a3b8',
      }))}
      chartKey={`severity-${data.severityCounts.length}`}
      cellKeyPrefix="sev-cell"
    />
  );
};

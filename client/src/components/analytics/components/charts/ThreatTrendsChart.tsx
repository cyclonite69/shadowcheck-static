import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AnalyticsData } from '../../hooks/useAnalyticsData';
import {
  TOOLTIP_CONFIG,
  AXIS_CONFIG,
  GRID_CONFIG,
  MARGINS,
  LEGEND_CONFIG,
  CHART_COLORS,
} from '../../utils/chartConfig';
import { isValidChartData, calculateAxisInterval } from '../../utils/chartHelpers';

interface Props {
  data: AnalyticsData;
  renderEmptyState: (message?: string) => React.ReactElement;
}

export const ThreatTrendsChart: React.FC<Props> = ({ data, renderEmptyState }) => {
  if (!isValidChartData(data.threatTrends)) return renderEmptyState();
  const interval = calculateAxisInterval(data.threatTrends.length);
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.threatTrends} margin={MARGINS.withBottomLabel}>
          <CartesianGrid {...GRID_CONFIG} />
          <XAxis dataKey="label" tick={AXIS_CONFIG.tick} interval={interval} />
          <YAxis
            yAxisId="left"
            tick={AXIS_CONFIG.tick}
            label={{
              value: 'Avg Threat Score',
              angle: -90,
              position: 'insideLeft',
              fill: '#94a3b8',
              fontSize: 10,
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={AXIS_CONFIG.tick}
            label={{
              value: 'Threat Count',
              angle: 90,
              position: 'insideRight',
              fill: '#94a3b8',
              fontSize: 10,
            }}
          />
          <Tooltip {...TOOLTIP_CONFIG} />
          <Legend {...LEGEND_CONFIG} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="avgScore"
            stroke={CHART_COLORS.threatTrends.avgScore}
            strokeWidth={3}
            name="Avg Score"
            dot={{ fill: CHART_COLORS.threatTrends.avgScore, r: 3 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="criticalCount"
            stroke={CHART_COLORS.threatTrends.criticalCount}
            strokeWidth={2}
            name="Critical (80+)"
            dot={{ fill: CHART_COLORS.threatTrends.criticalCount, r: 2 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="highCount"
            stroke={CHART_COLORS.threatTrends.highCount}
            strokeWidth={2}
            name="High (60-79)"
            dot={{ fill: CHART_COLORS.threatTrends.highCount, r: 2 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="mediumCount"
            stroke={CHART_COLORS.threatTrends.mediumCount}
            strokeWidth={2}
            name="Med (40-59)"
            dot={{ fill: CHART_COLORS.threatTrends.mediumCount, r: 2 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="lowCount"
            stroke={CHART_COLORS.threatTrends.lowCount}
            strokeWidth={2}
            name="Low (20-39)"
            dot={{ fill: CHART_COLORS.threatTrends.lowCount, r: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

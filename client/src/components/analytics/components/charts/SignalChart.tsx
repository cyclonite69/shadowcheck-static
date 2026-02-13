import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AnalyticsData } from '../../hooks/useAnalyticsData';
import {
  TOOLTIP_CONFIG,
  AXIS_CONFIG,
  GRID_CONFIG,
  MARGINS,
  BAR_CONFIG,
  CHART_COLORS,
} from '../../utils/chartConfig';
import { isValidChartData } from '../../utils/chartHelpers';

interface Props {
  data: AnalyticsData;
  renderEmptyState: (message?: string) => React.ReactElement;
}

export const SignalChart: React.FC<Props> = ({ data, renderEmptyState }) => {
  if (!isValidChartData(data.signalStrength)) return renderEmptyState();
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.signalStrength} margin={MARGINS.withBottomLabel}>
          <CartesianGrid {...GRID_CONFIG} />
          <XAxis dataKey="range" tick={AXIS_CONFIG.tick} angle={-45} textAnchor="end" height={80} />
          <YAxis tick={AXIS_CONFIG.tick} />
          <Tooltip {...TOOLTIP_CONFIG} />
          <Bar dataKey="count" fill={CHART_COLORS.signalStrength} {...BAR_CONFIG} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

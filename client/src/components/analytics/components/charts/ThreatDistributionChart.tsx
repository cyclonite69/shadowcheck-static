import React from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AnalyticsData } from '../../hooks/useAnalyticsData';
import {
  TOOLTIP_CONFIG,
  AXIS_CONFIG,
  GRID_CONFIG,
  MARGINS,
  BAR_CONFIG,
} from '../../utils/chartConfig';
import { isValidChartData } from '../../utils/chartHelpers';

interface Props {
  data: AnalyticsData;
  renderEmptyState: (message?: string) => React.ReactElement;
}

export const ThreatDistributionChart: React.FC<Props> = ({ data, renderEmptyState }) => {
  if (!isValidChartData(data.threatDistribution)) return renderEmptyState();
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.threatDistribution} margin={MARGINS.withBottomLabel}>
          <CartesianGrid {...GRID_CONFIG} />
          <XAxis
            dataKey="range"
            tick={AXIS_CONFIG.tick}
            label={{
              value: 'Threat Score Range',
              position: 'insideBottom',
              offset: -10,
              fill: '#94a3b8',
              fontSize: 10,
            }}
          />
          <YAxis tick={AXIS_CONFIG.tick} />
          <Tooltip {...TOOLTIP_CONFIG} />
          <Bar dataKey="count" {...BAR_CONFIG}>
            {data.threatDistribution.map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

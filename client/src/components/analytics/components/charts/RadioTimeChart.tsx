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
  LINE_CONFIG,
  CHART_COLORS,
} from '../../utils/chartConfig';
import { isValidChartData, calculateAxisInterval } from '../../utils/chartHelpers';

interface Props {
  data: AnalyticsData;
  renderEmptyState: (message?: string) => React.ReactElement;
}

export const RadioTimeChart: React.FC<Props> = ({ data, renderEmptyState }) => {
  if (!isValidChartData(data.radioTime)) return renderEmptyState();
  const interval = calculateAxisInterval(data.radioTime.length);
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.radioTime} margin={MARGINS.withBottomLabel}>
          <CartesianGrid {...GRID_CONFIG} />
          <XAxis dataKey="label" tick={AXIS_CONFIG.tick} interval={interval} />
          <YAxis tick={AXIS_CONFIG.tick} />
          <Tooltip {...TOOLTIP_CONFIG} />
          <Legend {...LEGEND_CONFIG} />
          <Line {...LINE_CONFIG} dataKey="WiFi" stroke={CHART_COLORS.radioTime.WiFi} />
          <Line {...LINE_CONFIG} dataKey="BLE" stroke={CHART_COLORS.radioTime.BLE} />
          <Line {...LINE_CONFIG} dataKey="BT" stroke={CHART_COLORS.radioTime.BT} />
          <Line {...LINE_CONFIG} dataKey="LTE" stroke={CHART_COLORS.radioTime.LTE} />
          <Line {...LINE_CONFIG} dataKey="GSM" stroke={CHART_COLORS.radioTime.GSM} />
          <Line {...LINE_CONFIG} dataKey="NR" stroke={CHART_COLORS.radioTime.NR} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

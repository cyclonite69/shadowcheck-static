import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { TOOLTIP_CONFIG } from '../../utils/chartConfig';
import { formatPieTooltip } from '../../utils/chartHelpers';

interface PieItem {
  name: string;
  value: number;
  color: string;
  severity?: string;
}

interface PieChartWithLegendProps {
  data: PieItem[];
  chartKey: string;
  cellKeyPrefix?: string;
}

export const PieChartWithLegend: React.FC<PieChartWithLegendProps> = ({
  data,
  chartKey,
  cellKeyPrefix = 'cell',
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex h-[260px] w-full flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%" key={chartKey}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="45%"
              outerRadius="70%"
              paddingAngle={2}
              dataKey="value"
              animationDuration={300}
            >
              {data.map((entry, idx) => (
                <Cell key={`${cellKeyPrefix}-${idx}-${entry.name}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              {...TOOLTIP_CONFIG}
              formatter={(value, name) => formatPieTooltip(value as number, name as string, total)}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 px-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] text-slate-300">
          {data.map((item) => {
            const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
            return (
              <div key={`legend-${item.name}`} className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate flex-1">{item.name}</span>
                <span className="text-slate-400 font-medium flex-shrink-0">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

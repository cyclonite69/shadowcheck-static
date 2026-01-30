// ===== FILE: src/components/analytics/utils/chartConfig.ts =====
// PURPOSE: Recharts configuration objects for consistent styling across analytics charts
// EXTRACTS: Common chart configurations from renderChart function

// Common tooltip configuration
export const TOOLTIP_CONFIG = {
  contentStyle: {
    backgroundColor: '#1e293b',
    border: '1px solid #475569',
    borderRadius: '6px',
  },
};

// Common axis configuration
export const AXIS_CONFIG = {
  tick: {
    fill: '#94a3b8',
    fontSize: 11,
  },
};

// Common grid configuration
export const GRID_CONFIG = {
  strokeDasharray: '3 3',
  stroke: 'rgba(148, 163, 184, 0.1)',
};

// Common margin configurations
export const MARGINS = {
  default: { top: 10, right: 20, left: 0, bottom: 20 },
  withBottomLabel: { top: 10, right: 20, left: 0, bottom: 30 },
  compact: { top: 10, right: 20, left: 0, bottom: 10 },
};

// Legend configuration (spacing handled via Tailwind containers, not wrapperStyle)
export const LEGEND_CONFIG = {
  iconType: 'circle' as const,
  iconSize: 8,
  formatter: (value: string) => <span className="text-slate-300 text-xs ml-1">{value}</span>,
};

// Pie chart specific configurations
export const PIE_CONFIG = {
  innerRadius: '45%',
  outerRadius: '65%',
  paddingAngle: 2,
  dataKey: 'value',
  animationDuration: 300,
};

// Bar chart configurations
export const BAR_CONFIG = {
  radius: [6, 6, 0, 0] as [number, number, number, number],
};

// Line chart configurations
export const LINE_CONFIG = {
  type: 'monotone' as const,
  strokeWidth: 2,
  dot: { r: 3 },
};

// Specific color configurations for different chart types
export const CHART_COLORS = {
  networkTypes: ['#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899', '#f59e0b', '#10b981'],
  securityTypes: [
    '#10b981',
    '#059669',
    '#34d399',
    '#3b82f6',
    '#2563eb',
    '#60a5fa',
    '#06b6d4',
    '#f59e0b',
    '#ef4444',
    '#f97316',
  ],
  signalStrength: '#06b6d4',
  temporal: '#38bdf8',
  threatDistribution: '#ef4444',
  radioTime: {
    WiFi: '#3b82f6',
    BLE: '#8b5cf6',
    BT: '#06b6d4',
    LTE: '#ec4899',
    GSM: '#f59e0b',
    NR: '#10b981',
  },
  threatTrends: {
    avgScore: '#f59e0b',
    criticalCount: '#ef4444',
    highCount: '#f97316',
    mediumCount: '#eab308',
    lowCount: '#22c55e',
  },
  severity: {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e',
    none: '#94a3b8',
  },
};

// Responsive container keys for forcing re-renders
export const getResponsiveContainerKey = (dataLength: number, filterEnabled: boolean) =>
  `${dataLength}-${filterEnabled ? 'filtered' : 'all'}`;

// ===== END FILE =====

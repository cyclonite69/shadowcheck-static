/**
 * Smart default badge configs for high-value Explorer columns.
 * All configs start with enabled: false — badges are opt-in.
 * The visual output of each default mirrors the existing hardcoded renderers
 * so activating them produces no visible change until customized.
 */

import type { ColumnBadgeConfig } from '../../types/badgeConfig';

const c = (accent: string) => ({ accentColor: accent });

export const BADGE_DEFAULTS: Record<string, ColumnBadgeConfig> = {
  threat: {
    column: 'threat',
    enabled: false,
    shape: 'pill',
    fill: 'ghost',
    size: 'normal',
    defaultColor: c('#475569'),
    rules: [
      { match: { type: 'exact', value: 'CRITICAL' }, color: c('#dc2626'), label: 'CRITICAL' },
      { match: { type: 'exact', value: 'HIGH' }, color: c('#ef4444'), label: 'HIGH' },
      { match: { type: 'exact', value: 'MED' }, color: c('#f97316'), label: 'MED' },
      { match: { type: 'exact', value: 'LOW' }, color: c('#eab308'), label: 'LOW' },
      { match: { type: 'any' }, color: c('#475569') },
    ],
  },

  type: {
    column: 'type',
    enabled: false,
    shape: 'chip',
    fill: 'outlined',
    size: 'compact',
    defaultColor: c('#6b7280'),
    rules: [
      { match: { type: 'exact', value: 'W' }, color: c('#3b82f6'), label: 'WiFi' },
      { match: { type: 'exact', value: 'E' }, color: c('#8b5cf6'), label: 'BLE' },
      { match: { type: 'exact', value: 'B' }, color: c('#06b6d4'), label: 'BT' },
      { match: { type: 'exact', value: 'L' }, color: c('#10b981'), label: 'LTE' },
      { match: { type: 'exact', value: 'N' }, color: c('#ec4899'), label: '5G' },
      { match: { type: 'exact', value: 'G' }, color: c('#f59e0b'), label: 'GSM' },
      { match: { type: 'any' }, color: c('#6b7280'), label: '?' },
    ],
  },

  security: {
    column: 'security',
    enabled: false,
    shape: 'tag',
    fill: 'ghost',
    size: 'compact',
    defaultColor: c('#94a3b8'),
    rules: [
      { match: { type: 'exact', value: 'OPEN' }, color: c('#f59e0b'), label: 'OPEN' },
      { match: { type: 'contains', value: 'WEP' }, color: c('#ef4444'), label: 'WEP' },
      { match: { type: 'contains', value: 'WPA3' }, color: c('#10b981'), label: 'WPA3' },
      { match: { type: 'contains', value: 'WPA2' }, color: c('#3b82f6'), label: 'WPA2' },
      { match: { type: 'contains', value: 'WPA' }, color: c('#06b6d4'), label: 'WPA' },
      { match: { type: 'any' }, color: c('#94a3b8') },
    ],
  },

  signal: {
    column: 'signal',
    enabled: false,
    shape: 'pill',
    fill: 'ghost',
    size: 'compact',
    defaultColor: c('#6b7280'),
    showRawValueAsTooltip: true,
    rules: [
      { match: { type: 'range', min: -50 }, color: c('#10b981') },
      { match: { type: 'range', min: -60, max: -51 }, color: c('#84cc16') },
      { match: { type: 'range', min: -70, max: -61 }, color: c('#f59e0b') },
      { match: { type: 'range', min: -80, max: -71 }, color: c('#f97316') },
      { match: { type: 'any' }, color: c('#ef4444') },
    ],
  },

  observations: {
    column: 'observations',
    enabled: false,
    shape: 'chip',
    fill: 'outlined',
    size: 'compact',
    defaultColor: c('#64748b'),
    rules: [
      { match: { type: 'range', min: 100 }, color: c('#f97316') },
      { match: { type: 'range', min: 20 }, color: c('#3b82f6') },
      { match: { type: 'any' }, color: c('#64748b') },
    ],
  },

  manufacturer: {
    column: 'manufacturer',
    enabled: false,
    shape: 'pill',
    fill: 'ghost',
    size: 'compact',
    defaultColor: c('#94a3b8'),
    hoverAction: 'vendor-intel-drawer',
    rules: [{ match: { type: 'any' }, color: c('#94a3b8') }],
  },

  threat_score: {
    column: 'threat_score',
    enabled: false,
    shape: 'square',
    fill: 'solid',
    size: 'compact',
    defaultColor: c('#22c55e'),
    showRawValueAsTooltip: true,
    rules: [
      { match: { type: 'range', min: 75 }, color: c('#dc2626') },
      { match: { type: 'range', min: 50 }, color: c('#f97316') },
      { match: { type: 'range', min: 25 }, color: c('#f59e0b') },
      { match: { type: 'any' }, color: c('#22c55e') },
    ],
  },

  timespanDays: {
    column: 'timespanDays',
    enabled: false,
    shape: 'pill',
    fill: 'ghost',
    size: 'compact',
    defaultColor: c('#94a3b8'),
    rules: [
      { match: { type: 'range', min: 365 }, color: c('#dc2626') },
      { match: { type: 'range', min: 90 }, color: c('#f97316') },
      { match: { type: 'range', min: 30 }, color: c('#f59e0b') },
      { match: { type: 'any' }, color: c('#94a3b8') },
    ],
  },
};

/** Sample values used for live preview in BadgeStudio (Phase 2). */
export const BADGE_PREVIEW_SAMPLES: Record<string, unknown[]> = {
  threat: ['CRITICAL', 'HIGH', 'MED', 'LOW', 'NONE'],
  type: ['W', 'E', 'B', 'L', 'N', 'G'],
  security: ['OPEN', 'WEP', 'WPA', 'WPA2', 'WPA3'],
  signal: [-45, -58, -68, -77, -92],
  observations: [1, 20, 80, 250, 0],
  manufacturer: ['Flock Safety', 'Apple Inc', 'Unknown'],
  threat_score: [85, 62, 40, 15, null],
  timespanDays: [400, 120, 45, 10, 1],
};

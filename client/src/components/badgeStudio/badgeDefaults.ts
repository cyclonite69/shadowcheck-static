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

  device_class: {
    column: 'device_class',
    enabled: false,
    shape: 'pill',
    fill: 'solid',
    size: 'compact',
    defaultColor: c('#475569'),
    hoverAction: 'vendor-intel-drawer',
    rules: [
      // SIGINT / intercept / private OUI: high emphasis
      {
        match: { type: 'exact', value: 'L3HARRIS_STINGRAY' },
        color: c('#dc2626'),
        label: 'L3Harris StingRay',
      },
      {
        match: { type: 'exact', value: 'VERINT_INTERCEPT' },
        color: c('#dc2626'),
        label: 'Verint Intercept',
      },
      {
        match: { type: 'exact', value: 'SEPTIER_WIFICATCHER' },
        color: c('#dc2626'),
        label: 'Septier WiFi Catcher',
      },
      {
        match: { type: 'exact', value: 'ABILITY_INTERCEPT' },
        color: c('#dc2626'),
        label: 'Ability Intercept',
      },
      {
        match: { type: 'exact', value: 'ROHDE_SCHWARZ_WLAN' },
        color: c('#dc2626'),
        label: 'Rohde & Schwarz WLAN',
      },
      {
        match: { type: 'exact', value: 'COBHAM_SIGINT' },
        color: c('#dc2626'),
        label: 'Cobham SIGINT',
      },
      {
        match: { type: 'exact', value: 'PRIVATE_OUI_REGISTERED' },
        color: c('#dc2626'),
        label: 'Private OUI',
      },
      // Defense / C4ISR: high or amber
      {
        match: { type: 'exact', value: 'RAYTHEON_ESYSTEMS' },
        color: c('#f97316'),
        label: 'Raytheon E-Systems',
      },
      {
        match: { type: 'exact', value: 'NORSAT_SATCOM' },
        color: c('#f97316'),
        label: 'Norsat Satcom',
      },
      {
        match: { type: 'exact', value: 'GENERAL_DYNAMICS_C4ISR' },
        color: c('#f97316'),
        label: 'General Dynamics C4ISR',
      },
      {
        match: { type: 'exact', value: 'NORTHROP_GRUMMAN_ISR' },
        color: c('#f97316'),
        label: 'Northrop Grumman ISR',
      },
      {
        match: { type: 'exact', value: 'LEONARDO_DRS_TACTICAL' },
        color: c('#f97316'),
        label: 'Leonardo DRS Tactical',
      },
      {
        match: { type: 'exact', value: 'TADIRAN_COMMS' },
        color: c('#f97316'),
        label: 'Tadiran Comms',
      },
      // LEO sensors / body cameras: medium/high
      {
        match: { type: 'exact', value: 'FLOCK_SAFETY_CAMERA' },
        color: c('#ef4444'),
        label: 'Flock Camera',
      },
      {
        match: { type: 'exact', value: 'FS_EXT_BATTERY' },
        color: c('#ef4444'),
        label: 'Flock Battery',
      },
      {
        match: { type: 'exact', value: 'SHOTSPOTTER_SENSOR' },
        color: c('#ef4444'),
        label: 'ShotSpotter',
      },
      {
        match: { type: 'exact', value: 'AXON_BODY_CAMERA' },
        color: c('#3b82f6'),
        label: 'Axon BWC',
      },
      {
        match: { type: 'exact', value: 'MOTOROLA_BWC' },
        color: c('#3b82f6'),
        label: 'Motorola BWC',
      },
      // Dual-use infrastructure
      {
        match: { type: 'exact', value: 'UBIQUITI_MESH' },
        color: c('#eab308'),
        label: 'Ubiquiti Mesh',
      },
      {
        match: { type: 'exact', value: 'CAMBIUM_BACKHAUL' },
        color: c('#eab308'),
        label: 'Cambium Backhaul',
      },
      {
        match: { type: 'exact', value: 'PROXIM_SURVEILLANCE' },
        color: c('#eab308'),
        label: 'Proxim Surveillance',
      },
      {
        match: { type: 'exact', value: 'PEPLINK_MOBILEPOST' },
        color: c('#eab308'),
        label: 'Peplink Mobile Post',
      },
      // Fallback: prettify raw enum value
      { match: { type: 'any' }, color: c('#6b7280') },
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
  device_class: [
    'FLOCK_SAFETY_CAMERA',
    'SHOTSPOTTER_SENSOR',
    'AXON_BODY_CAMERA',
    'L3HARRIS_STINGRAY',
    'GENERAL_DYNAMICS_C4ISR',
    'UBIQUITI_MESH',
    null,
  ],
};

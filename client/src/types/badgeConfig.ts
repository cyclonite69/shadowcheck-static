// Badge Studio type definitions for Network Explorer column badge configuration.

export type BadgeShape = 'pill' | 'tag' | 'chip' | 'square' | 'dot-label' | 'icon-only';
export type BadgeFill = 'solid' | 'outlined' | 'ghost' | 'text-only';
export type BadgeSize = 'compact' | 'normal' | 'prominent';

/**
 * Full color spec for a badge. All fields except accentColor are optional;
 * resolveBadgeColors() derives missing values from accentColor + fill mode.
 */
export interface BadgeColor {
  accentColor: string;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
}

export type BadgeMatchRule =
  | { type: 'exact'; value: string | number | boolean }
  | { type: 'range'; min?: number; max?: number }
  | { type: 'regex'; pattern: string }
  | { type: 'contains'; value: string }
  | { type: 'any' };

export interface BadgeColorRule {
  match: BadgeMatchRule;
  color: BadgeColor;
  /** Display text override for matching values */
  label?: string;
}

export interface ColumnBadgeConfig {
  column: string;
  enabled: boolean;
  shape: BadgeShape;
  fill: BadgeFill;
  size: BadgeSize;
  defaultColor: BadgeColor;
  /** Evaluated top-to-bottom; first match wins */
  rules: BadgeColorRule[];
  showRawValueAsTooltip?: boolean;
  hoverAction?: 'none' | 'vendor-intel-drawer';
}

export interface BadgePreset {
  id: string;
  name: string;
  description?: string;
  columns: ColumnBadgeConfig[];
  createdAt: string;
  updatedAt: string;
}

export interface BadgeStudioState {
  activePresetId: string | null;
  unsavedConfigs: Record<string, ColumnBadgeConfig>;
}

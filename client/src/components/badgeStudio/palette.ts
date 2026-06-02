/**
 * Semantic color palette for Badge Studio.
 * All accent colors align with the existing ShadowCheck design system
 * (constants/colors.ts, constants/network.ts, networkFormatting.ts).
 */

export type PaletteGroup =
  | 'threat'
  | 'signal'
  | 'security'
  | 'network-type'
  | 'surveillance'
  | 'neutral';

export interface PaletteEntry {
  name: string;
  /** Stable token used in preset serialization */
  token: string;
  accent: string;
  group: PaletteGroup;
}

export const SEMANTIC_PALETTE: PaletteEntry[] = [
  // ── Threat ──────────────────────────────────────────────────────────────
  { name: 'Critical', token: 'threat-critical', accent: '#dc2626', group: 'threat' },
  { name: 'High', token: 'threat-high', accent: '#ef4444', group: 'threat' },
  { name: 'Medium', token: 'threat-medium', accent: '#f97316', group: 'threat' },
  { name: 'Low', token: 'threat-low', accent: '#eab308', group: 'threat' },
  { name: 'Clear', token: 'threat-clear', accent: '#22c55e', group: 'threat' },

  // ── Signal ──────────────────────────────────────────────────────────────
  { name: 'Excellent', token: 'signal-excellent', accent: '#10b981', group: 'signal' },
  { name: 'Good', token: 'signal-good', accent: '#84cc16', group: 'signal' },
  { name: 'Fair', token: 'signal-fair', accent: '#f59e0b', group: 'signal' },
  { name: 'Poor', token: 'signal-poor', accent: '#f97316', group: 'signal' },
  { name: 'Very Poor', token: 'signal-verypoor', accent: '#ef4444', group: 'signal' },

  // ── Security ────────────────────────────────────────────────────────────
  { name: 'Open', token: 'sec-open', accent: '#f59e0b', group: 'security' },
  { name: 'WEP', token: 'sec-wep', accent: '#ef4444', group: 'security' },
  { name: 'WPA', token: 'sec-wpa', accent: '#06b6d4', group: 'security' },
  { name: 'WPA2', token: 'sec-wpa2', accent: '#3b82f6', group: 'security' },
  { name: 'WPA3', token: 'sec-wpa3', accent: '#10b981', group: 'security' },

  // ── Network Type ────────────────────────────────────────────────────────
  { name: 'WiFi', token: 'type-wifi', accent: '#3b82f6', group: 'network-type' },
  { name: 'BLE', token: 'type-ble', accent: '#8b5cf6', group: 'network-type' },
  { name: 'LTE', token: 'type-lte', accent: '#10b981', group: 'network-type' },
  { name: 'GSM', token: 'type-gsm', accent: '#f59e0b', group: 'network-type' },
  { name: '5G NR', token: 'type-5g', accent: '#ec4899', group: 'network-type' },
  { name: 'Bluetooth', token: 'type-bt', accent: '#06b6d4', group: 'network-type' },

  // ── Surveillance ────────────────────────────────────────────────────────
  { name: 'Surveillance', token: 'surv-red', accent: '#dc2626', group: 'surveillance' },
  { name: 'Intercept', token: 'surv-amber', accent: '#d97706', group: 'surveillance' },
  { name: 'Body Camera', token: 'surv-orange', accent: '#ea580c', group: 'surveillance' },
  { name: 'Mesh/Backhaul', token: 'surv-yellow', accent: '#ca8a04', group: 'surveillance' },
  { name: 'SIGINT', token: 'surv-crimson', accent: '#be123c', group: 'surveillance' },

  // ── Neutral ─────────────────────────────────────────────────────────────
  { name: 'Muted', token: 'neutral-muted', accent: '#64748b', group: 'neutral' },
  { name: 'Subtle', token: 'neutral-subtle', accent: '#94a3b8', group: 'neutral' },
  { name: 'White', token: 'neutral-white', accent: '#f1f5f9', group: 'neutral' },
  { name: 'Slate', token: 'neutral-slate', accent: '#475569', group: 'neutral' },
  { name: 'Info Blue', token: 'neutral-info', accent: '#60a5fa', group: 'neutral' },
];

/** Look up a palette entry by its stable token. Returns undefined if not found. */
export function paletteByToken(token: string): PaletteEntry | undefined {
  return SEMANTIC_PALETTE.find((e) => e.token === token);
}

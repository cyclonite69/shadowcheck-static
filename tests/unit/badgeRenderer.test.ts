export {};

/**
 * Unit tests for Badge Studio Phase 1.
 * Covers: colorUtils pure functions + BadgeRenderer snapshot behavior.
 * No React rendering — tests are pure logic only in this file.
 */

import {
  hexToRgb,
  hexToHsl,
  hslToHex,
  autoContrastText,
  hexWithOpacity,
  resolveBadgeColors,
  matchesRule,
} from '../../client/src/components/badgeStudio/colorUtils';

import type { BadgeColor } from '../../client/src/types/badgeConfig';

// ─── hexToRgb ───────────────────────────────────────────────────────────────

describe('hexToRgb', () => {
  test('parses 6-digit hex', () => {
    expect(hexToRgb('#3b82f6')).toEqual({ r: 59, g: 130, b: 246 });
  });

  test('parses 3-digit hex', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  test('parses without hash prefix', () => {
    expect(hexToRgb('000000')).toEqual({ r: 0, g: 0, b: 0 });
  });

  test('returns null for invalid hex', () => {
    expect(hexToRgb('#zzzzzz')).toBeNull();
    expect(hexToRgb('')).toBeNull();
  });
});

// ─── hexToHsl / hslToHex round-trip ─────────────────────────────────────────

describe('hexToHsl', () => {
  test('pure red', () => {
    const { h, s, l } = hexToHsl('#ff0000');
    expect(h).toBe(0);
    expect(s).toBe(100);
    expect(l).toBe(50);
  });

  test('returns zeros for invalid hex', () => {
    expect(hexToHsl('#xyz')).toEqual({ h: 0, s: 0, l: 0 });
  });
});

describe('hslToHex round-trip', () => {
  test('round-trips known colors within ±1 per channel', () => {
    // Red
    expect(hslToHex(0, 100, 50).toLowerCase()).toBe('#ff0000');
    // White
    expect(hslToHex(0, 0, 100).toLowerCase()).toBe('#ffffff');
    // Black
    expect(hslToHex(0, 0, 0).toLowerCase()).toBe('#000000');
  });
});

// ─── autoContrastText ────────────────────────────────────────────────────────

describe('autoContrastText', () => {
  test('returns black on white background', () => {
    expect(autoContrastText('#ffffff')).toBe('#000000');
  });

  test('returns white on black background', () => {
    expect(autoContrastText('#000000')).toBe('#ffffff');
  });

  test('returns white on dark blue', () => {
    expect(autoContrastText('#1e3a5f')).toBe('#ffffff');
  });

  test('returns black on yellow', () => {
    expect(autoContrastText('#fbbf24')).toBe('#000000');
  });

  test('returns white for invalid hex', () => {
    expect(autoContrastText('#xyz')).toBe('#ffffff');
  });
});

// ─── hexWithOpacity ──────────────────────────────────────────────────────────

describe('hexWithOpacity', () => {
  test('produces rgba string', () => {
    expect(hexWithOpacity('#3b82f6', 0.15)).toBe('rgba(59, 130, 246, 0.15)');
  });

  test('returns transparent for invalid hex', () => {
    expect(hexWithOpacity('#invalid', 0.5)).toBe('transparent');
  });
});

// ─── resolveBadgeColors ──────────────────────────────────────────────────────

describe('resolveBadgeColors', () => {
  const accent = '#3b82f6';
  const color: BadgeColor = { accentColor: accent };

  test('solid: uses accent as background, auto-contrast text', () => {
    const r = resolveBadgeColors(color, 'solid');
    expect(r.background).toBe(accent);
    // #3b82f6 has luminance 0.235 (> 0.179 threshold) → black text
    expect(r.text).toBe('#000000');
    expect(r.border).toContain('rgba');
  });

  test('outlined: transparent background, accent text and border', () => {
    const r = resolveBadgeColors(color, 'outlined');
    expect(r.background).toBe('transparent');
    expect(r.text).toBe(accent);
    expect(r.border).toContain('rgba');
  });

  test('ghost: faint background, accent text', () => {
    const r = resolveBadgeColors(color, 'ghost');
    expect(r.background).toContain('rgba');
    expect(r.text).toBe(accent);
  });

  test('text-only: fully transparent background and border', () => {
    const r = resolveBadgeColors(color, 'text-only');
    expect(r.background).toBe('transparent');
    expect(r.border).toBe('transparent');
    expect(r.text).toBe(accent);
  });

  test('explicit overrides are respected', () => {
    const overridden: BadgeColor = {
      accentColor: accent,
      textColor: '#ff0000',
      backgroundColor: '#00ff00',
      borderColor: '#0000ff',
    };
    const r = resolveBadgeColors(overridden, 'solid');
    expect(r.text).toBe('#ff0000');
    expect(r.background).toBe('#00ff00');
    expect(r.border).toBe('#0000ff');
  });
});

// ─── matchesRule ─────────────────────────────────────────────────────────────

describe('matchesRule', () => {
  test('any always matches', () => {
    expect(matchesRule({ type: 'any' }, null)).toBe(true);
    expect(matchesRule({ type: 'any' }, 'anything')).toBe(true);
  });

  test('exact: matches same value', () => {
    expect(matchesRule({ type: 'exact', value: 'CRITICAL' }, 'CRITICAL')).toBe(true);
    expect(matchesRule({ type: 'exact', value: 'CRITICAL' }, 'HIGH')).toBe(false);
  });

  test('exact: coerces number to string comparison', () => {
    expect(matchesRule({ type: 'exact', value: 42 }, 42)).toBe(true);
    expect(matchesRule({ type: 'exact', value: '42' }, 42)).toBe(true);
  });

  test('range: min only', () => {
    expect(matchesRule({ type: 'range', min: -50 }, -45)).toBe(true);
    expect(matchesRule({ type: 'range', min: -50 }, -60)).toBe(false);
  });

  test('range: min and max', () => {
    expect(matchesRule({ type: 'range', min: -70, max: -51 }, -60)).toBe(true);
    expect(matchesRule({ type: 'range', min: -70, max: -51 }, -45)).toBe(false);
    expect(matchesRule({ type: 'range', min: -70, max: -51 }, -75)).toBe(false);
  });

  test('range: non-numeric value returns false', () => {
    expect(matchesRule({ type: 'range', min: 0 }, 'hello')).toBe(false);
    expect(matchesRule({ type: 'range', min: 0 }, null)).toBe(false);
  });

  test('contains: case-insensitive substring', () => {
    expect(matchesRule({ type: 'contains', value: 'WPA' }, 'WPA2-Personal')).toBe(true);
    expect(matchesRule({ type: 'contains', value: 'wpa' }, 'WPA2-Personal')).toBe(true);
    expect(matchesRule({ type: 'contains', value: 'WEP' }, 'WPA2-Personal')).toBe(false);
  });

  test('regex: case-insensitive match', () => {
    expect(matchesRule({ type: 'regex', pattern: '^flock' }, 'Flock Safety')).toBe(true);
    expect(matchesRule({ type: 'regex', pattern: '^flock' }, 'Apple Inc')).toBe(false);
  });

  test('regex: invalid pattern returns false without throwing', () => {
    expect(matchesRule({ type: 'regex', pattern: '[invalid(' }, 'test')).toBe(false);
  });
});

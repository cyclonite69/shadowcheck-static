/**
 * BSSID-based color generation for network visualization
 * macColor is the canonical implementation in utils/mapHelpers.ts
 */

import { macColor } from '../mapHelpers';

export { macColor } from '../mapHelpers';

/**
 * Parse HSL color string to components
 */
const parseHsl = (value: string): { h: number; s: number; l: number } | null => {
  const match = value.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/i);
  if (!match) return null;
  return { h: Number(match[1]), s: Number(match[2]), l: Number(match[3]) };
};

/**
 * Calculate dominant color for a cluster of BSSIDs
 * @param bssids - Array of MAC addresses
 * @returns HSL color string representing the cluster
 */
export const dominantClusterColor = (bssids: string[]): string => {
  if (bssids.length === 0) return '#38bdf8';

  const buckets = new Map<number, { count: number; sTotal: number; lTotal: number }>();

  bssids.forEach((bssid) => {
    const hsl = parseHsl(macColor(bssid));
    if (!hsl) return;

    const hueBucket = hsl.h;
    const existing = buckets.get(hueBucket);

    if (existing) {
      existing.count += 1;
      existing.sTotal += hsl.s;
      existing.lTotal += hsl.l;
    } else {
      buckets.set(hueBucket, { count: 1, sTotal: hsl.s, lTotal: hsl.l });
    }
  });

  if (buckets.size === 0) return '#38bdf8';

  let bestHue = 0;
  let best = { count: 0, sTotal: 0, lTotal: 0 };

  buckets.forEach((entry, hue) => {
    if (entry.count > best.count) {
      bestHue = hue;
      best = entry;
    }
  });

  const avgS = Math.round(best.sTotal / best.count);
  const avgL = Math.round(best.lTotal / best.count);

  return `hsl(${bestHue}, ${avgS}%, ${avgL}%)`;
};

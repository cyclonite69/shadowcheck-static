/**
 * BSSID-based color generation for network visualization
 * Generates consistent colors based on MAC address OUI and device parts
 */

const BASE_HUES = [0, 60, 120, 180, 240, 270, 300, 330];

const stringToHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  return Math.abs(hash);
};

/**
 * Generate a color for a MAC address
 * @param mac - MAC address (BSSID)
 * @returns HSL color string
 */
export const macColor = (mac: string): string => {
  if (!mac || mac.length < 6) return '#999999';

  const cleanedMac = mac.replace(/[^0-9A-F]/gi, '');
  if (cleanedMac.length < 6) return '#999999';

  const oui = cleanedMac.substring(0, 6); // Manufacturer part
  const devicePart = cleanedMac.substring(6); // Device-specific part

  const hue = BASE_HUES[stringToHash(oui) % BASE_HUES.length];
  const saturation = 50 + (stringToHash(devicePart) % 41); // 50-90%
  const lightness = 40 + (stringToHash(devicePart) % 31); // 40-70%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

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

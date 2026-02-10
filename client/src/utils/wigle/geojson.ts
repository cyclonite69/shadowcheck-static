import { macColor } from './colors';

export type WigleRow = {
  bssid: string;
  ssid: string | null;
  trilat: number;
  trilong: number;
  type: string;
  encryption: string | null;
  channel?: number | null;
  frequency?: number | null;
  firsttime?: string | null;
  lasttime: string;
  accuracy?: number | null;
};

export const EMPTY_FEATURE_COLLECTION = {
  type: 'FeatureCollection' as const,
  features: [] as any[],
};

/**
 * Convert WiGLE rows to GeoJSON FeatureCollection
 */
export function rowsToGeoJSON(rows: WigleRow[]) {
  return {
    type: 'FeatureCollection' as const,
    features: rows.map((row) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [Number(row.trilong), Number(row.trilat)],
      },
      properties: {
        bssid: row.bssid,
        ssid: row.ssid || '(hidden)',
        type: row.type,
        encryption: row.encryption || 'Unknown',
        channel: row.channel,
        frequency: row.frequency,
        firsttime: row.firsttime,
        lasttime: row.lasttime,
        accuracy: row.accuracy,
        color: macColor(row.bssid),
      },
    })),
  };
}

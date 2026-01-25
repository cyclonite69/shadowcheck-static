// Map-related helper functions for ShadowCheck

// Create a GeoJSON circle polygon from center and radius in meters
export const createCirclePolygon = (
  center: [number, number],
  radiusMeters: number,
  steps = 64
): GeoJSON.Feature<GeoJSON.Polygon> => {
  const coords: [number, number][] = [];
  const km = radiusMeters / 1000;
  const distanceX = km / (111.32 * Math.cos((center[1] * Math.PI) / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < steps; i++) {
    const theta = (i / steps) * (2 * Math.PI);
    const x = center[0] + distanceX * Math.cos(theta);
    const y = center[1] + distanceY * Math.sin(theta);
    coords.push([x, y]);
  }
  coords.push(coords[0]); // Close the polygon

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
  };
};

// Signal range calculation based on signal strength and frequency
export const calculateSignalRange = (
  signalDbm: number | null,
  frequencyMhz?: number | null,
  zoom: number = 10
): number => {
  if (!signalDbm || signalDbm === null) return 40;

  let freq = frequencyMhz;
  if (typeof freq === 'string') {
    freq = parseFloat((freq as any).replace(' GHz', '')) * 1000;
  }
  if (!freq || freq <= 0) freq = 2437; // Default to channel 6 (2.4GHz)

  // Signal strength to distance mapping (inverse relationship)
  // Stronger signal = closer = smaller circle, weaker signal = farther = larger circle
  let distanceM;
  if (signalDbm >= -30) distanceM = 15;
  else if (signalDbm >= -50) distanceM = 40;
  else if (signalDbm >= -60) distanceM = 80;
  else if (signalDbm >= -70) distanceM = 120;
  else if (signalDbm >= -80) distanceM = 180;
  else distanceM = 250;

  // Frequency adjustment (5GHz has shorter range)
  if (freq > 5000) distanceM *= 0.7;

  // Zoom-based scaling - make circle larger at higher zoom levels
  const zoomScale = Math.pow(1.25, zoom - 12);
  let radiusPixels = distanceM * Math.max(0.5, Math.min(zoomScale, 6));

  // Clamp radius for display - ensure minimum visibility
  return Math.max(20, Math.min(radiusPixels, 300));
};

// BSSID-based color generation for consistent network coloring
export const macColor = (mac: string): string => {
  if (!mac || mac.length < 6) return '#999999';

  const BASE_HUES = [0, 60, 120, 180, 240, 270, 300, 330];
  const stringToHash = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const cleanedMac = mac.replace(/[^0-9A-F]/gi, '');
  if (cleanedMac.length < 6) return '#999999';

  const oui = cleanedMac.substring(0, 6); // Manufacturer part
  const devicePart = cleanedMac.substring(6); // Device-specific part

  const hue = BASE_HUES[stringToHash(oui) % BASE_HUES.length];
  let saturation = 50 + (stringToHash(devicePart) % 41); // 50-90%
  let lightness = 40 + (stringToHash(devicePart) % 31); // 40-70%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// Create a Google Maps tile style for Mapbox GL
export const createGoogleStyle = (type: string) => ({
  version: 8 as const,
  sources: {
    'google-tiles': {
      type: 'raster' as const,
      tiles: [`/api/google-maps-tile/${type}/{z}/{x}/{y}`],
      tileSize: 256,
      attribution: '© Google Maps',
    },
  },
  layers: [
    {
      id: 'google-tiles-layer',
      type: 'raster' as const,
      source: 'google-tiles',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
});

import { useRef, useCallback } from 'react';
import { logWarn } from '../../logging/clientLogger';
import { renderNetworkTooltip } from '../../utils/geospatial/renderNetworkTooltip';
import { formatSecurity } from '../../utils/wigle';
import type { NetworkData, DrawMode } from './types';

declare global {
  interface Window {
    deck?: any;
    mapboxgl?: any;
  }
}

interface UseKeplerDeckOptions {
  mapRef: React.RefObject<HTMLDivElement | null>;
  selectedPoints: NetworkData[];
  setSelectedPoints: React.Dispatch<React.SetStateAction<NetworkData[]>>;
  drawMode: DrawMode;
  pitch: number;
}

export function useKeplerDeck({
  mapRef,
  selectedPoints,
  setSelectedPoints,
  drawMode,
  pitch,
}: UseKeplerDeckOptions) {
  const deckRef = useRef<any>(null);

  const initDeck = useCallback(
    (token: string, data: NetworkData[]) => {
      if (!window.deck || !mapRef.current) return;

      let centerLon = -83.6968;
      let centerLat = 43.0234;
      let zoom = 10;

      if (data && data.length > 0) {
        const validData = data.filter(
          (d) =>
            d.position &&
            d.position.length >= 2 &&
            typeof d.position[0] === 'number' &&
            typeof d.position[1] === 'number' &&
            !isNaN(d.position[0]) &&
            !isNaN(d.position[1])
        );

        if (validData.length > 0) {
          let minLon = Infinity,
            maxLon = -Infinity;
          let minLat = Infinity,
            maxLat = -Infinity;

          for (const d of validData) {
            const [lon, lat] = d.position;
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
          }

          centerLon = (minLon + maxLon) / 2;
          centerLat = (minLat + maxLat) / 2;

          const lonDiff = maxLon - minLon;
          const latDiff = maxLat - minLat;
          const maxDiff = Math.max(lonDiff, latDiff, 0.01);
          zoom = Math.max(1, Math.min(15, 10 - Math.log2(maxDiff)));
        }
      }

      const { DeckGL } = window.deck;
      const mapboxgl = window.mapboxgl;
      deckRef.current = new DeckGL({
        container: mapRef.current,
        mapLib: mapboxgl,
        mapboxApiAccessToken: token,
        mapStyle: 'mapbox://styles/mapbox/dark-v11',
        initialViewState: {
          longitude: centerLon,
          latitude: centerLat,
          zoom: zoom,
          pitch: pitch,
          bearing: 0,
          minZoom: 1,
          maxZoom: 24,
        },
        controller: drawMode === 'none',
        useDevicePixels: false,
        getTooltip: ({ object }: { object: any }) => {
          if (!object) return null;

          const tooltipHTML = renderNetworkTooltip({
            ssid: object.ssid,
            bssid: object.bssid,
            type: object.type,
            threat_level: object.threat_level,
            threat_score: object.threat_score,
            signal: object.signal || object.bestlevel,
            security: formatSecurity(object.capabilities || object.encryption),
            frequency: object.frequency,
            channel: object.channel,
            lat: object.position ? object.position[1] : null,
            lon: object.position ? object.position[0] : null,
            altitude: object.altitude,
            manufacturer: object.manufacturer,
            observation_count: object.obs_count || object.observation_count || object.observations,
            timespan_days: object.timespan_days,
            time: object.timestamp || object.time,
            first_seen: object.first_seen || object.timestamp,
            last_seen: object.last_seen,
            distance_from_home_km: object.distance_from_home,
            max_distance_km: object.max_distance_km,
            unique_days: object.unique_days,
            accuracy: object.accuracy,
          });

          return {
            html: tooltipHTML,
            style: {
              backgroundColor: 'transparent',
              border: 'none',
              boxShadow: 'none',
              padding: '0',
              fontSize: '12px',
            },
          };
        },
        onClick: ({ object }: { object: any }) => {
          if (object && !selectedPoints.find((p) => p.bssid === object.bssid)) {
            setSelectedPoints((prev) => [...prev, object]);
          }
        },
      });

      // Add orientation controls to the underlying Mapbox map
      setTimeout(() => {
        try {
          const mapboxMap = deckRef.current?.deck?.getMapboxMap?.();
          if (mapboxMap) {
            import('../../utils/mapOrientationControls')
              .then(async ({ attachMapOrientationControls }) => {
                await attachMapOrientationControls(mapboxMap, {
                  scalePosition: 'bottom-right',
                  scaleUnit: 'metric',
                  ensureNavigation: true,
                  navigationPosition: 'top-right',
                });
              })
              .catch((err) => {
                logWarn('Failed to load map orientation controls module', err);
              });
          }
        } catch (e) {
          logWarn('Could not attach map controls to DeckGL', e);
        }
      }, 100);

      setTimeout(() => {
        try {
          const attribList = mapRef.current?.querySelector(
            '.mapboxgl-ctrl-attrib-inner[role="list"]'
          );
          if (!attribList) return;
          attribList.querySelectorAll('a').forEach((anchor) => {
            anchor.setAttribute('role', 'listitem');
          });
        } catch {
          // Mapbox attribution markup is vendor-controlled; fail silently.
        }
      }, 150);
    },
    [mapRef, selectedPoints, setSelectedPoints, drawMode, pitch]
  );

  return { deckRef, initDeck };
}

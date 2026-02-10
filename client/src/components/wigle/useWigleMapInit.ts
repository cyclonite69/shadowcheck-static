/**
 * WiGLE Map Initialization Hook
 * Handles Mapbox map setup and configuration
 */

import { useEffect, useRef, useState } from 'react';
import type mapboxglType from 'mapbox-gl';
import { logDebug } from '../../logging/clientLogger';

interface UseWigleMapInitProps {
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  mapStyle: string;
  onMapReady: (map: mapboxglType.Map, mapbox: typeof mapboxglType) => void;
}

export function useWigleMapInit({ mapContainerRef, mapStyle, onMapReady }: UseWigleMapInitProps) {
  const mapRef = useRef<mapboxglType.Map | null>(null);
  const mapboxRef = useRef<mapboxglType | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [tilesReady, setTilesReady] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initMap = async () => {
      try {
        const tokenRes = await fetch('/api/mapbox-token');
        if (!tokenRes.ok) {
          setTokenStatus('error');
          return;
        }

        const { token } = await tokenRes.json();
        setTokenStatus('ok');

        const mapboxgl = (await import('mapbox-gl')).default;
        mapboxgl.accessToken = token;
        mapboxRef.current = mapboxgl;

        const initialStyleUrl = mapStyle.startsWith('mapbox://styles/mapbox/standard')
          ? 'mapbox://styles/mapbox/dark-v11'
          : mapStyle;

        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: initialStyleUrl,
          center: [-83.69682688, 43.02345147],
          zoom: 12,
          attributionControl: false,
        });

        map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        map.addControl(
          new mapboxgl.AttributionControl({
            compact: true,
            customAttribution: 'ShadowCheck WiGLE Explorer',
          })
        );

        map.on('load', () => {
          logDebug('[WiGLE] Map loaded');
          setMapReady(true);
          onMapReady(map, mapboxgl);
        });

        map.on('idle', () => {
          if (!tilesReady) {
            setTilesReady(true);
          }
        });

        mapRef.current = map;
      } catch (err) {
        console.error('[WiGLE] Map init failed:', err);
        setTokenStatus('error');
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapContainerRef, mapStyle]);

  return {
    mapRef,
    mapboxRef,
    mapReady,
    tokenStatus,
    tilesReady,
  };
}

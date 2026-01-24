import { useEffect } from 'react';
import type mapboxglType from 'mapbox-gl';

interface UseBoundingBoxFilterParams {
  mapReady: boolean;
  mapRef: React.MutableRefObject<mapboxglType.Map | null>;
  enabled: boolean;
  setFilter: (key: string, value: unknown) => void;
}

export const useBoundingBoxFilter = ({
  mapReady,
  mapRef,
  enabled,
  setFilter,
}: UseBoundingBoxFilterParams) => {
  useEffect(() => {
    if (!mapReady || !mapRef.current || !enabled) return;

    const map = mapRef.current;
    const updateBounds = () => {
      const bounds = map.getBounds();
      setFilter('boundingBox', {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    };

    updateBounds();
    map.on('moveend', updateBounds);
    return () => {
      map.off('moveend', updateBounds);
    };
  }, [enabled, mapReady, mapRef, setFilter]);
};

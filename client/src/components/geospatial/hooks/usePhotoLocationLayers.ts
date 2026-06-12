import { useEffect } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import type * as mapboxglType from 'mapbox-gl';
import { networkApi } from '../../../api/networkApi';

type PhotoLocationProps = {
  mapReady: boolean;
  mapRef: React.MutableRefObject<MapboxMap | null>;
  mapboxRef: React.MutableRefObject<typeof mapboxglType | null>;
  mapStyle?: string;
  showPhotoLocations: boolean;
};

/**
 * Hook to manage unmatched media photo layers and interaction popups.
 */
export const usePhotoLocationLayers = ({
  mapReady,
  mapRef,
  mapboxRef,
  mapStyle,
  showPhotoLocations,
}: PhotoLocationProps) => {
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;

    if (!showPhotoLocations) {
      // Clean up layers and source
      if (map.getLayer('photo-location-icons')) {
        map.removeLayer('photo-location-icons');
      }
      if (map.getLayer('photo-location-markers')) {
        map.removeLayer('photo-location-markers');
      }
      if (map.getSource('photo-locations')) {
        map.removeSource('photo-locations');
      }
      return;
    }

    let active = true;

    const handlePhotoClick = (e: any) => {
      if (!e.features || e.features.length === 0) return;
      const feature = e.features[0];
      const props = feature.properties;
      if (!props) return;

      const html = `
        <div style="padding: 10px; font-family: monospace; font-size: 11px; color: #e2e8f0; background: #0f172a; border-radius: 6px;">
          <div style="font-weight: bold; margin-bottom: 4px; color: #ec4899;">⚠️ UNMATCHED MEDIA</div>
          <div style="margin-bottom: 6px; word-break: break-all;">File: ${props.filename}</div>
          <div style="margin-bottom: 8px; color: #94a3b8;">Captured: ${props.captured_at ? new Date(props.captured_at).toLocaleString() : 'N/A'}</div>
          <div style="display: flex; justify-content: center; background: #1e293b; padding: 4px; border-radius: 4px;">
            <img src="${props.thumbnail_url}" style="max-width: 150px; max-height: 150px; border-radius: 3px; cursor: pointer;" data-media-id="${props.id}" />
          </div>
        </div>
      `;

      if (mapboxgl) {
        const popup = new (mapboxgl as any).Popup({
          offset: 15,
          className: 'sc-popup',
          closeOnClick: true,
          closeButton: false,
        })
          .setLngLat(e.lngLat)
          .setHTML(html)
          .addTo(map);

        const popupEl = popup.getElement();
        if (popupEl) {
          popupEl.addEventListener('click', (ev: MouseEvent) => {
            const target = (ev.target as HTMLElement).closest(
              '[data-media-id]'
            ) as HTMLElement | null;
            if (target) {
              const mediaId = target.getAttribute('data-media-id');
              if (mediaId) {
                window.open(`/api/admin/network-media/${mediaId}/inline`, '_blank');
              }
            }
          });
        }
      }
    };

    const loadPhotoLocations = async () => {
      try {
        const data = await networkApi.getUnmatchedMediaGeoJson();
        if (!active) return;

        if (!map.getSource('photo-locations')) {
          map.addSource('photo-locations', {
            type: 'geojson',
            data,
          });

          map.addLayer({
            id: 'photo-location-markers',
            type: 'circle',
            source: 'photo-locations',
            paint: {
              'circle-radius': 8,
              'circle-color': '#EC4899',
              'circle-stroke-width': 1.5,
              'circle-stroke-color': '#ffffff',
            },
          });

          // Circle-based fallback for icons (white lens dot)
          map.addLayer({
            id: 'photo-location-icons',
            type: 'circle',
            source: 'photo-locations',
            paint: {
              'circle-radius': 3,
              'circle-color': '#ffffff',
            },
          });

          map.on('click', 'photo-location-markers', handlePhotoClick);
        }
      } catch (err) {
        console.error('Failed to load photo locations', err);
      }
    };

    loadPhotoLocations();

    return () => {
      active = false;
      map.off('click', 'photo-location-markers', handlePhotoClick);

      if (map.getLayer('photo-location-icons')) {
        map.removeLayer('photo-location-icons');
      }
      if (map.getLayer('photo-location-markers')) {
        map.removeLayer('photo-location-markers');
      }
      if (map.getSource('photo-locations')) {
        map.removeSource('photo-locations');
      }
    };
  }, [mapReady, mapRef, mapboxRef, showPhotoLocations, mapStyle]);
};

import React from 'react';
import type { Map } from 'mapbox-gl';
import type * as mapboxglType from 'mapbox-gl';
import { fitBoundsWithZoomInset } from '../utils/geospatial/mapViewUtils';

const FitIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <polyline points="1,4 1,1 4,1" />
    <polyline points="10,1 13,1 13,4" />
    <polyline points="13,10 13,13 10,13" />
    <polyline points="4,13 1,13 1,10" />
  </svg>
);

const HomeIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M2 7L7 2L12 7" />
    <path d="M3 7V12H6V9H8V12H11V7" />
  </svg>
);

interface WigleMapProps {
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  error: string | null;
  mapReady: boolean;
  mapRef: React.MutableRefObject<Map | null>;
  mapboxRef: React.MutableRefObject<typeof mapboxglType | null>;
  homeLocation: { center: [number, number]; radius: number };
  v2Rows: Array<{ trilat?: number; trilong?: number; lat?: number; lon?: number }>;
  v3Rows: Array<{ trilat?: number; trilong?: number; lat?: number; lon?: number }>;
}

export const WigleMap: React.FC<WigleMapProps> = ({
  mapContainerRef,
  error,
  mapReady,
  mapRef,
  mapboxRef,
  homeLocation,
  v2Rows,
  v3Rows,
}) => {
  const [homeActive, setHomeActive] = React.useState(false);
  const [fitActive, setFitActive] = React.useState(false);

  const allRows = [...v2Rows, ...v3Rows];
  const canFit = allRows.length > 0;

  const btnStyle = (active: boolean, disabled = false): React.CSSProperties => ({
    width: '30px',
    height: '30px',
    borderRadius: '6px',
    border: 'none',
    background: active ? 'rgba(16,185,129,0.2)' : 'transparent',
    color: disabled ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.7)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.4 : 1,
  });

  return (
    <div
      className="flex-1"
      style={{ minHeight: 'calc(100vh - 48px)', background: '#0b1220', position: 'relative' }}
    >
      <div ref={mapContainerRef} className="absolute inset-0" />

      {/* Home + Fit buttons — far right, matching geospatial toolbar position */}
      {mapReady && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            zIndex: 10,
          }}
        >
          <button
            className="nav-icon-btn"
            title="Fit to bounds"
            disabled={!canFit}
            style={btnStyle(fitActive, !canFit)}
            onClick={() => {
              const mapboxgl = mapboxRef.current;
              if (!mapRef.current || !mapboxgl || !canFit) return;
              setFitActive(true);
              const coords = allRows
                .map((r) => {
                  const lat = r.trilat ?? (r as any).lat ?? (r as any).latitude;
                  const lon =
                    r.trilong ?? (r as any).trilon ?? (r as any).lon ?? (r as any).longitude;
                  return lat != null && lon != null ? ([lon, lat] as [number, number]) : null;
                })
                .filter((c): c is [number, number] => c !== null);
              if (coords.length === 0) return;
              const bounds = coords.reduce(
                (b, c) => b.extend(c),
                new (mapboxgl as any).LngLatBounds(coords[0], coords[0])
              );
              fitBoundsWithZoomInset(mapRef.current, bounds, { padding: 80 });
              setTimeout(() => setFitActive(false), 2000);
            }}
          >
            <FitIcon />
          </button>

          <button
            className="nav-icon-btn"
            title="Fly home"
            style={btnStyle(homeActive)}
            onClick={() => {
              if (!mapRef.current) return;
              setHomeActive(true);
              mapRef.current.flyTo({ center: homeLocation.center, zoom: 17 });
              setTimeout(() => setHomeActive(false), 2000);
            }}
          >
            <HomeIcon />
          </button>
        </div>
      )}

      {!mapReady && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            fontSize: '12px',
            pointerEvents: 'none',
          }}
        >
          Loading map…
        </div>
      )}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/20 text-red-300 px-4 py-2 rounded-lg border border-red-500/30 z-50 text-sm backdrop-blur-sm">
          {error}
        </div>
      )}
    </div>
  );
};

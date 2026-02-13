import { useEffect } from 'react';
import { logDebug } from '../../logging/clientLogger';
import type { NetworkData, LayerType } from './types';

interface UseKeplerVisualizationOptions {
  deckRef: React.RefObject<any>;
  networkData: NetworkData[];
  layerType: LayerType;
  pointSize: number;
  signalThreshold: number;
  height3d: number;
}

export function useKeplerVisualization({
  deckRef,
  networkData,
  layerType,
  pointSize,
  signalThreshold,
  height3d,
}: UseKeplerVisualizationOptions) {
  useEffect(() => {
    if (!deckRef.current || !window.deck || networkData.length === 0) return;

    logDebug(`[Kepler] Updating visualization with ${networkData.length} points`);

    const filteredData = networkData.filter((d) => d.signal >= signalThreshold);
    let layer;

    if (layerType === 'scatterplot') {
      layer = new window.deck.ScatterplotLayer({
        id: 'networks',
        data: filteredData,
        getPosition: (d: NetworkData) => d.position,
        getRadius: pointSize * 10,
        getFillColor: (d: NetworkData) => {
          if (d.signal > -50) return [255, 0, 0, 180];
          if (d.signal > -70) return [255, 255, 0, 180];
          return [0, 255, 0, 180];
        },
        pickable: true,
        radiusMinPixels: 2,
        radiusMaxPixels: 50,
      });
    } else if (layerType === 'heatmap') {
      layer = new window.deck.HeatmapLayer({
        id: 'networks-heatmap',
        data: filteredData,
        getPosition: (d: NetworkData) => d.position,
        getWeight: (d: NetworkData) => Math.max(1, d.signal / 10),
        radiusPixels: 50,
      });
    } else if (layerType === 'hexagon') {
      layer = new window.deck.HexagonLayer({
        id: 'networks-hexagon',
        data: filteredData,
        getPosition: (d: NetworkData) => d.position,
        radius: 200,
        elevationScale: height3d * 4,
        extruded: true,
        pickable: true,
        getFillColor: [255, 140, 0, 180],
      });
    }

    deckRef.current.setProps({ layers: [layer] });
  }, [networkData, layerType, pointSize, signalThreshold, height3d]);
}

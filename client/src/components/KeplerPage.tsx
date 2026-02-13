import { usePageFilters } from '../hooks/usePageFilters';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useFilterURLSync } from '../hooks/useFilteredData';
import { useAdaptedFilters } from '../hooks/useAdaptedFilters';
import { getPageCapabilities } from '../utils/filterCapabilities';
import { HamburgerButton } from './HamburgerButton';
import { ControlPanel } from './ControlPanel';
import { FilterPanelContainer } from './FilterPanelContainer';
import { useKeplerDeck } from './kepler/useKeplerDeck';
import { useKeplerDataLoader } from './kepler/useKeplerDataLoader';
import { useKeplerVisualization } from './kepler/useKeplerVisualization';
import { KeplerControlPanel } from './kepler/KeplerControlPanel';
import type { LayerType, DrawMode } from './kepler/types';

const KeplerPage: React.FC = () => {
  usePageFilters('kepler');

  const mapRef = useRef<HTMLDivElement | null>(null);
  const [selectedPoints, setSelectedPoints] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Universal filter system
  const capabilities = useMemo(() => getPageCapabilities('kepler'), []);
  const adaptedFilters = useAdaptedFilters(capabilities);
  useFilterURLSync();

  // Visualization controls
  const [layerType, setLayerType] = useState<LayerType>('scatterplot');
  const [pointSize, setPointSize] = useState<number>(0.1);
  const [signalThreshold, setSignalThreshold] = useState<number>(-100);
  const [pitch, setPitch] = useState<number>(0);
  const [height3d, setHeight3d] = useState<number>(1);
  const [drawMode, setDrawMode] = useState<DrawMode>('none');
  const [datasetType, setDatasetType] = useState<'observations' | 'networks'>('observations');

  const { deckRef, initDeck } = useKeplerDeck({
    mapRef,
    selectedPoints,
    setSelectedPoints,
    drawMode,
    pitch,
  });

  const { networkData, loading, error, actualCounts } = useKeplerDataLoader({
    datasetType,
    adaptedFilters,
    initDeck,
    deckRef,
  });

  useKeplerVisualization({
    deckRef,
    networkData,
    layerType,
    pointSize,
    signalThreshold,
    height3d,
  });

  // Update pitch and controller
  useEffect(() => {
    if (deckRef.current) {
      deckRef.current.setProps({
        initialViewState: {
          ...deckRef.current.props.initialViewState,
          pitch: pitch,
        },
        controller: drawMode === 'none',
      });
    }
  }, [pitch, drawMode]);

  const filteredCount = networkData.filter((d) => d.signal >= signalThreshold).length;

  return (
    <div className="h-screen w-full text-white flex min-h-0">
      <HamburgerButton isOpen={showMenu} onClick={() => setShowMenu(!showMenu)} />

      <ControlPanel
        isOpen={showMenu}
        onShowFilters={() => setShowFilters(!showFilters)}
        showFilters={showFilters}
      >
        <KeplerControlPanel
          datasetType={datasetType}
          setDatasetType={setDatasetType}
          layerType={layerType}
          setLayerType={setLayerType}
          pointSize={pointSize}
          setPointSize={setPointSize}
          signalThreshold={signalThreshold}
          setSignalThreshold={setSignalThreshold}
          pitch={pitch}
          setPitch={setPitch}
          height3d={height3d}
          setHeight3d={setHeight3d}
          drawMode={drawMode}
          setDrawMode={setDrawMode}
          actualCounts={actualCounts}
          filteredCount={filteredCount}
          totalCount={networkData.length}
          selectedCount={selectedPoints.length}
          onClearSelection={() => setSelectedPoints([])}
        />
      </ControlPanel>

      <FilterPanelContainer
        isOpen={showFilters && showMenu}
        adaptedFilters={adaptedFilters}
        position="overlay"
      />

      {/* Map Area */}
      <section className="flex-1 min-h-0 h-full relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-50">
            <div className="px-4 py-3 bg-slate-800 rounded-lg border border-slate-700">
              Loading network data…
            </div>
          </div>
        )}

        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-900 text-red-100 px-4 py-2 rounded-lg border border-red-700 z-50">
            {error}
          </div>
        )}

        <div ref={mapRef} className="h-full w-full relative" />
      </section>
    </div>
  );
};

export default KeplerPage;

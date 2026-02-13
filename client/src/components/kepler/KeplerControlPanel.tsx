import React from 'react';
import type { NetworkData, LayerType, DrawMode } from './types';

interface KeplerControlPanelProps {
  datasetType: 'observations' | 'networks';
  setDatasetType: (type: 'observations' | 'networks') => void;
  layerType: LayerType;
  setLayerType: (type: LayerType) => void;
  pointSize: number;
  setPointSize: (size: number) => void;
  signalThreshold: number;
  setSignalThreshold: (threshold: number) => void;
  pitch: number;
  setPitch: (pitch: number) => void;
  height3d: number;
  setHeight3d: (height: number) => void;
  drawMode: DrawMode;
  setDrawMode: (mode: DrawMode) => void;
  actualCounts: { observations: number; networks: number } | null;
  filteredCount: number;
  totalCount: number;
  selectedCount: number;
  onClearSelection: () => void;
}

export const KeplerControlPanel: React.FC<KeplerControlPanelProps> = ({
  datasetType,
  setDatasetType,
  layerType,
  setLayerType,
  pointSize,
  setPointSize,
  signalThreshold,
  setSignalThreshold,
  pitch,
  setPitch,
  height3d,
  setHeight3d,
  drawMode,
  setDrawMode,
  actualCounts,
  filteredCount,
  totalCount,
  selectedCount,
  onClearSelection,
}) => (
  <>
    <div>
      <label className="block mb-1 text-xs text-slate-300">Dataset:</label>
      <label className="sr-only" htmlFor="dataset-select">
        Dataset
      </label>
      <select
        id="dataset-select"
        value={datasetType}
        onChange={(e) => setDatasetType(e.target.value as 'observations' | 'networks')}
        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs"
      >
        <option value="observations">
          Observations ({actualCounts ? actualCounts.observations.toLocaleString() : '416K'} raw)
        </option>
        <option value="networks">
          Networks ({actualCounts ? actualCounts.networks.toLocaleString() : '117K'} trilaterated)
        </option>
      </select>
    </div>

    <div>
      <label className="block mb-1 text-xs text-slate-300">3D View - Pitch: {pitch}°</label>
      <label className="sr-only" htmlFor="pitch-slider">
        3D view pitch
      </label>
      <input
        id="pitch-slider"
        type="range"
        min="0"
        max="60"
        value={pitch}
        onChange={(e) => setPitch(parseInt(e.target.value))}
        className="w-full"
      />
    </div>

    <div>
      <label className="block mb-1 text-xs text-slate-300">3D Height: {height3d}</label>
      <label className="sr-only" htmlFor="height-3d-slider">
        3D height
      </label>
      <input
        id="height-3d-slider"
        type="range"
        min="1"
        max="50"
        value={height3d}
        onChange={(e) => setHeight3d(parseInt(e.target.value))}
        className="w-full"
      />
    </div>

    <div>
      <label className="block mb-1 text-xs text-slate-300">Visualization Type:</label>
      <label className="sr-only" htmlFor="render-mode-select">
        Render mode
      </label>
      <select
        id="render-mode-select"
        value={layerType}
        onChange={(e) => setLayerType(e.target.value as LayerType)}
        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs"
      >
        <option value="scatterplot">Points</option>
        <option value="heatmap">Heatmap</option>
        <option value="hexagon">Hexagon Clusters</option>
      </select>
    </div>

    <div>
      <label className="block mb-1 text-xs text-slate-300">Point Size: {pointSize}</label>
      <label className="sr-only" htmlFor="point-size-slider">
        Point size
      </label>
      <input
        id="point-size-slider"
        type="range"
        min="0.1"
        max="10"
        step="0.1"
        value={pointSize}
        onChange={(e) => setPointSize(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>

    <div>
      <label className="block mb-1 text-xs text-slate-300">Drawing Mode:</label>
      <label className="sr-only" htmlFor="selection-mode-select">
        Selection tool
      </label>
      <select
        id="selection-mode-select"
        value={drawMode}
        onChange={(e) => setDrawMode(e.target.value as DrawMode)}
        className="w-full min-h-[44px] bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-xs"
      >
        <option value="none">None</option>
        <option value="rectangle">Rectangle Select</option>
        <option value="polygon">Polygon Select</option>
        <option value="circle">Circle Select</option>
      </select>
    </div>

    <button
      onClick={onClearSelection}
      className="w-full min-h-[44px] px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-xs"
    >
      Clear Selection
    </button>

    <div>
      <label className="block mb-1 text-xs text-slate-300">
        Signal Threshold: {signalThreshold} dBm
      </label>
      <label className="sr-only" htmlFor="signal-threshold-slider">
        Signal threshold (dBm)
      </label>
      <input
        id="signal-threshold-slider"
        type="range"
        min="-100"
        max="-30"
        value={signalThreshold}
        onChange={(e) => setSignalThreshold(parseInt(e.target.value))}
        className="w-full"
      />
    </div>

    <div className="text-xs pt-3 mt-2 border-t border-blue-500/20 bg-gradient-to-b from-blue-500/5 to-transparent p-3 -mx-5 -mb-5 rounded-b-xl">
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">DB Total:</span>
          <span className="text-blue-400 font-semibold">
            {actualCounts ? actualCounts.observations.toLocaleString() : 'Loading...'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Rendered:</span>
          <span className="text-blue-400 font-semibold">
            {filteredCount.toLocaleString()} / {totalCount.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Selected:</span>
          <span className="text-emerald-400 font-semibold">{selectedCount}</span>
        </div>
        <div className="text-slate-500 text-[10px] mt-2 pt-2 border-t border-slate-700/50">
          &#9889; WebGL &#x2022; &#128205; Interactive &#x2022; &#128293; GPU Accelerated
        </div>
      </div>
    </div>
  </>
);

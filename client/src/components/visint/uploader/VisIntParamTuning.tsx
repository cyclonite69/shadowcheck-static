import React from 'react';

export interface VisIntParamTuningProps {
  radiusMeters: number;
  setRadiusMeters: (val: number) => void;
  windowHours: number;
  setWindowHours: (val: number) => void;
  limit: number;
  setLimit: (val: number) => void;
  showSettings: boolean;
  setShowSettings: (val: boolean) => void;
}

export const VisIntParamTuning: React.FC<VisIntParamTuningProps> = ({
  radiusMeters,
  setRadiusMeters,
  windowHours,
  setWindowHours,
  limit,
  setLimit,
  showSettings,
  setShowSettings,
}) => {
  return (
    <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800 space-y-3">
      <button
        type="button"
        onClick={() => setShowSettings(!showSettings)}
        className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-300 transition-colors"
      >
        <span>Search Parameter Tuning</span>
        <span className="text-[10px]">{showSettings ? '▲' : '▼'}</span>
      </button>

      {showSettings && (
        <div className="space-y-3 pt-2 border-t border-slate-800/60">
          <div>
            <label
              htmlFor="radius-input"
              className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1"
            >
              Spatial Radius: {radiusMeters} meters
            </label>
            <input
              id="radius-input"
              type="range"
              min="10"
              max="1000"
              step="10"
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          <div>
            <label
              htmlFor="hours-input"
              className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1"
            >
              Temporal Window: ±{windowHours} hours
            </label>
            <input
              id="hours-input"
              type="range"
              min="1"
              max="168"
              step="1"
              value={windowHours}
              onChange={(e) => setWindowHours(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          <div>
            <label
              htmlFor="limit-input"
              className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1"
            >
              Max Candidates (X): {limit}
            </label>
            <input
              id="limit-input"
              type="range"
              min="1"
              max="50"
              step="1"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

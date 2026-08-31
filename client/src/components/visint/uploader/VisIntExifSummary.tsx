import React from 'react';

export interface VisIntExifSummaryProps {
  candidatesCount: number;
  exif: {
    lat: number;
    lon: number;
    ts: string;
  };
}

export const VisIntExifSummary: React.FC<VisIntExifSummaryProps> = ({ candidatesCount, exif }) => {
  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <span className="text-sm font-semibold text-white">Pipeline Summary</span>
        <span className="text-xs font-semibold text-cyan-400">
          {candidatesCount} candidate(s) found
        </span>
      </div>

      {/* EXIF Data */}
      <div className="grid grid-cols-3 gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-900">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            EXIF Latitude
          </span>
          <span className="text-xs font-mono font-semibold text-slate-300">
            {exif.lat.toFixed(6)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            EXIF Longitude
          </span>
          <span className="text-xs font-mono font-semibold text-slate-300">
            {exif.lon.toFixed(6)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            EXIF Timestamp
          </span>
          <span
            className="text-[11px] font-mono font-semibold text-slate-300 truncate"
            title={exif.ts}
          >
            {exif.ts}
          </span>
        </div>
      </div>
    </>
  );
};

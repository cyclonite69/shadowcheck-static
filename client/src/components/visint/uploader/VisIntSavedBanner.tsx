import React, { useState } from 'react';

export interface VisIntSavedBannerProps {
  selectedBssid: string;
  selectedCandidateId: string | null;
  saveTags: string[];
  onReset: () => void;
}

export const VisIntSavedBanner: React.FC<VisIntSavedBannerProps> = ({
  selectedBssid,
  selectedCandidateId,
  saveTags,
  onReset,
}) => {
  const [copiedKey, setCopiedKey] = useState<'bssid' | 'obs' | null>(null);

  const copyToClipboard = (text: string, key: 'bssid' | 'obs') => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="flex flex-col space-y-4 p-5 rounded-xl border border-emerald-800/60 bg-emerald-950/10 text-slate-200">
      <div className="flex items-center space-x-2 border-b border-emerald-900/50 pb-3">
        <svg
          className="w-6 h-6 text-emerald-400 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="font-bold text-white text-md">Correlation Completed & Saved</span>
      </div>

      <div className="space-y-2 text-sm">
        <p className="flex items-center gap-2">
          Image attachment has been linked to BSSID:{' '}
          <button
            type="button"
            onClick={() => copyToClipboard(selectedBssid, 'bssid')}
            className="font-mono text-cyan-300 hover:text-cyan-200 cursor-pointer bg-transparent border-none p-0 inline-flex items-center gap-1.5 font-bold"
            title="Click to copy BSSID"
          >
            {selectedBssid}
            <span className="text-[10px] text-slate-500 font-sans font-normal">
              {copiedKey === 'bssid' ? '(Copied!)' : '(Copy)'}
            </span>
          </button>
        </p>
        {selectedCandidateId !== 'unmatched' && (
          <p className="flex items-center gap-2">
            Matched Observation ID:{' '}
            <button
              type="button"
              onClick={() => copyToClipboard(String(selectedCandidateId), 'obs')}
              className="font-mono text-slate-300 hover:text-slate-200 cursor-pointer bg-transparent border-none p-0 inline-flex items-center gap-1.5 font-bold"
              title="Click to copy Observation ID"
            >
              {selectedCandidateId}
              <span className="text-[10px] text-slate-500 font-sans font-normal">
                {copiedKey === 'obs' ? '(Copied!)' : '(Copy)'}
              </span>
            </button>
          </p>
        )}
        <div>
          <div className="text-xs text-slate-400 mt-2 mb-1 uppercase tracking-wider font-semibold">
            Tags Applied:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {saveTags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 font-mono"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="mt-4 px-4 py-2 border border-emerald-800 hover:bg-emerald-950/30 text-emerald-300 hover:text-emerald-200 rounded-lg text-xs font-semibold transition-all text-center"
      >
        Reset & Correlate Another Image
      </button>
    </div>
  );
};

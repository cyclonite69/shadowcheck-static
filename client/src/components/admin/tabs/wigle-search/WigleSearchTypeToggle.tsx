import React from 'react';

export interface WigleSearchTypeToggleProps {
  searchType: 'wifi' | 'bluetooth';
  setSearchType: (type: 'wifi' | 'bluetooth') => void;
}

export const WigleSearchTypeToggle: React.FC<WigleSearchTypeToggleProps> = ({
  searchType,
  setSearchType,
}) => {
  return (
    <div className="flex gap-2 mb-1">
      <button
        onClick={() => setSearchType('wifi')}
        className={`px-4 py-1.5 rounded text-xs font-semibold transition-colors ${
          searchType === 'wifi'
            ? 'bg-blue-600 text-white'
            : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/60'
        }`}
      >
        WiFi
      </button>
      <button
        onClick={() => setSearchType('bluetooth')}
        className={`px-4 py-1.5 rounded text-xs font-semibold transition-colors ${
          searchType === 'bluetooth'
            ? 'bg-purple-600 text-white'
            : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/60'
        }`}
      >
        Bluetooth / BLE
      </button>
    </div>
  );
};

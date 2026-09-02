import React, { ChangeEvent } from 'react';
import { AdminCard } from '../../components/AdminCard';
import { SearchIcon } from './WigleDetailIcons';
import type { WigleDetailType } from '../../hooks/useWigleDetail';

export interface WigleDetailSearchCardProps {
  netid: string;
  setNetid: (val: string) => void;
  detailType: WigleDetailType;
  setDetailType: (type: WigleDetailType) => void;
  loading: boolean;
  handleSearch: (autoImport: boolean) => Promise<void>;
  handleFileUpload: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  error: string | null;
  uploadError: string | null;
  uploadSuccess: string | null;
}

export const WigleDetailSearchCard: React.FC<WigleDetailSearchCardProps> = ({
  netid,
  setNetid,
  detailType,
  setDetailType,
  loading,
  handleSearch,
  handleFileUpload,
  error,
  uploadError,
  uploadSuccess,
}) => {
  return (
    <AdminCard
      icon={SearchIcon}
      title="Network Detail Lookup (v3)"
      color="from-cyan-500 to-cyan-600"
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Fetch deep forensic details for a single network from WiGLE API v3 or upload a JSON file.
        </p>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded border border-slate-600/60 overflow-hidden">
            {(['wifi', 'bt'] as WigleDetailType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setDetailType(type)}
                className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  detailType === type
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {type === 'wifi' ? 'Wi-Fi' : 'BT/BLE'}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={netid}
            onChange={(e) => setNetid(e.target.value)}
            placeholder={
              detailType === 'wifi'
                ? 'Enter Wi-Fi BSSID (e.g., 00:11:22:33:44:55)'
                : 'Enter BT Network ID (e.g., EC:81:93:76:BD:CE)'
            }
            className="flex-1 px-3 py-2.5 bg-slate-800/50 border border-slate-600/60 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 font-mono"
          />
          <button
            onClick={() => handleSearch(false)}
            disabled={loading || !netid}
            className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium disabled:opacity-50 text-sm transition-all"
          >
            Lookup
          </button>
          <button
            onClick={() => handleSearch(true)}
            disabled={loading || !netid}
            className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium disabled:opacity-50 text-sm transition-all"
          >
            Lookup & Import
          </button>

          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              id="wigle-json-upload"
            />
            <label
              htmlFor="wigle-json-upload"
              className="flex items-center justify-center px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium cursor-pointer text-sm transition-all h-full"
              title="Upload v3 JSON"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </label>
          </div>
        </div>

        {error && (
          <div className="text-red-400 text-sm p-3 bg-red-900/20 rounded border border-red-700/50">
            {error}
          </div>
        )}
        {uploadError && (
          <div className="text-red-400 text-sm p-3 bg-red-900/20 rounded border border-red-700/50">
            Upload Error: {uploadError}
          </div>
        )}
        {uploadSuccess && (
          <div className="text-green-400 text-sm p-3 bg-green-900/20 rounded border border-green-700/50">
            Success: {uploadSuccess}
          </div>
        )}
      </div>
    </AdminCard>
  );
};

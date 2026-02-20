import React from 'react';
import { AdminCard } from '../components/AdminCard';
import { useDataImport } from '../hooks/useDataImport';

const UploadIcon = ({ size = 24, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

export const DataImportTab: React.FC = () => {
  const { isLoading, importStatus, sourceTag, setSourceTag, handleFileImport } = useDataImport();

  const canImport = !isLoading && sourceTag.trim().length > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* SQLite Import */}
      <AdminCard icon={UploadIcon} title="SQLite Import" color="from-orange-500 to-orange-600">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Import observations from WiGLE SQLite backups. Only new records (after the last import
            for this source) are added — safe to re-run.
          </p>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Source Tag{' '}
              <span className="text-slate-500">(device identifier, e.g. s22_backup)</span>
            </label>
            <input
              type="text"
              value={sourceTag}
              onChange={(e) => setSourceTag(e.target.value)}
              placeholder="e.g. s22_backup"
              disabled={isLoading}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500 disabled:opacity-50"
            />
          </div>

          <label className="block">
            <input
              id="sqlite-upload"
              type="file"
              accept=".sqlite,.db,.sqlite3"
              onChange={handleFileImport}
              disabled={!canImport}
              className="hidden"
            />
            <div
              className={`px-4 py-2.5 rounded-lg font-medium text-sm text-center transition-all text-white bg-gradient-to-r from-orange-600 to-orange-700 ${
                canImport
                  ? 'hover:from-orange-500 hover:to-orange-600 cursor-pointer'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              onClick={() => canImport && document.getElementById('sqlite-upload')?.click()}
            >
              {isLoading ? 'Importing...' : 'Choose SQLite File'}
            </div>
          </label>

          {importStatus && (
            <div
              className={`p-3 rounded-lg text-sm ${
                importStatus.startsWith('Imported')
                  ? 'bg-green-900/30 text-green-300 border border-green-700/50'
                  : 'bg-red-900/30 text-red-300 border border-red-700/50'
              }`}
            >
              {importStatus}
            </div>
          )}
        </div>
      </AdminCard>

      {/* CSV Import */}
      <AdminCard icon={UploadIcon} title="CSV Import" color="from-green-500 to-green-600">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Import networks from comma-separated values files with standard network data.
          </p>
          <label className="block">
            <div className="relative cursor-pointer">
              <input id="csv-upload" type="file" accept=".csv" disabled className="hidden" />
              <div className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium hover:from-green-500 hover:to-green-600 transition-all text-sm text-center opacity-50 cursor-not-allowed">
                Choose CSV File
              </div>
            </div>
          </label>
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-700/50">
            <p className="mt-2">Expected columns:</p>
            <p>• SSID, BSSID, Latitude, Longitude</p>
          </div>
        </div>
      </AdminCard>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { AdminCard } from '../components/AdminCard';
import { useDataImport } from '../hooks/useDataImport';
import { adminApi } from '../../../api/adminApi';

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

interface ImportRun {
  id: number;
  started_at: string;
  finished_at: string | null;
  source_tag: string;
  filename: string | null;
  imported: number | null;
  failed: number | null;
  duration_s: string | null;
  status: 'running' | 'success' | 'failed';
  error_detail: string | null;
}

function ImportHistory({ refreshKey }: { refreshKey: number }) {
  const [history, setHistory] = useState<ImportRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi
      .getImportHistory(10)
      .then((data: any) => setHistory(data?.history ?? []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) return <p className="text-sm text-slate-500 py-2">Loading history...</p>;
  if (history.length === 0)
    return <p className="text-sm text-slate-500 py-2">No imports recorded yet.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-slate-300">
        <thead>
          <tr className="text-slate-500 border-b border-slate-700/50">
            <th className="text-left py-1.5 pr-3">When</th>
            <th className="text-left py-1.5 pr-3">Source</th>
            <th className="text-left py-1.5 pr-3">File</th>
            <th className="text-right py-1.5 pr-3">Imported</th>
            <th className="text-right py-1.5 pr-3">Failed</th>
            <th className="text-right py-1.5 pr-3">Duration</th>
            <th className="text-left py-1.5">Status</th>
          </tr>
        </thead>
        <tbody>
          {history.map((run) => (
            <tr key={run.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
              <td className="py-1.5 pr-3 text-slate-400 whitespace-nowrap">
                {new Date(run.started_at).toLocaleString()}
              </td>
              <td className="py-1.5 pr-3 font-mono">{run.source_tag}</td>
              <td
                className="py-1.5 pr-3 text-slate-400 max-w-[140px] truncate"
                title={run.filename ?? ''}
              >
                {run.filename ?? '—'}
              </td>
              <td className="py-1.5 pr-3 text-right tabular-nums">
                {run.imported !== null ? run.imported.toLocaleString() : '—'}
              </td>
              <td className="py-1.5 pr-3 text-right tabular-nums">
                {run.failed !== null ? run.failed.toLocaleString() : '—'}
              </td>
              <td className="py-1.5 pr-3 text-right tabular-nums text-slate-400">
                {run.duration_s !== null ? `${run.duration_s}s` : '—'}
              </td>
              <td className="py-1.5">
                {run.status === 'success' && <span className="text-green-400">✓ success</span>}
                {run.status === 'failed' && (
                  <span className="text-red-400" title={run.error_detail ?? ''}>
                    ✗ failed
                  </span>
                )}
                {run.status === 'running' && <span className="text-yellow-400">⏳ running</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const DataImportTab: React.FC = () => {
  const { isLoading, importStatus, sourceTag, setSourceTag, handleFileImport } = useDataImport();
  const [historyKey, setHistoryKey] = useState(0);

  // Refresh history after an import completes
  useEffect(() => {
    if (!isLoading && importStatus) setHistoryKey((k) => k + 1);
  }, [isLoading, importStatus]);

  const canImport = !isLoading && sourceTag.trim().length > 0;

  return (
    <div className="space-y-6">
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
            <div className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium text-sm text-center opacity-50 cursor-not-allowed">
              Choose CSV File
            </div>
            <div className="text-xs text-slate-500 pt-2 border-t border-slate-700/50">
              <p className="mt-2">Expected columns:</p>
              <p>• SSID, BSSID, Latitude, Longitude</p>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* Import History */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Import History</h3>
        <ImportHistory refreshKey={historyKey} />
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { AdminCard } from '../components/AdminCard';
import { useDataImport } from '../hooks/useDataImport';
import { SourceTagInput } from '../components/SourceTagInput';
import { ImportHistory, MetricsTable } from './data-import/ImportHistory';

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
  const {
    isLoading,
    importStatus,
    sqlImportStatus,
    lastResult,
    sourceTag,
    setSourceTag,
    backupEnabled,
    setBackupEnabled,
    handleFileImport,
    handleSqlFileImport,
  } = useDataImport();
  const [historyKey, setHistoryKey] = useState(0);

  useEffect(() => {
    if (!isLoading && (importStatus || sqlImportStatus)) setHistoryKey((k) => k + 1);
  }, [isLoading, importStatus, sqlImportStatus]);

  const canImport = !isLoading && sourceTag.trim().length > 0;

  // Smart Detect: Suggest Kismet mode if filename looks like a kismet file
  const [showKismetSuggestion, setShowKismetSuggestion] = useState(false);
  const handleFileSelectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.kismet')) {
      setShowKismetSuggestion(true);
    } else {
      setShowKismetSuggestion(false);
    }
    handleFileImport(e);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* SQLite/Kismet Import */}
        <AdminCard
          icon={UploadIcon}
          title="SQLite / Kismet Import"
          color={
            showKismetSuggestion ? 'from-purple-500 to-purple-600' : 'from-orange-500 to-orange-600'
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Import observations from WiGLE SQLite backups or native Kismet sidecar files.
            </p>

            {showKismetSuggestion && (
              <div className="p-2 bg-purple-900/30 border border-purple-500/50 rounded-lg text-xs text-purple-300 animate-pulse">
                ✨ <strong>Kismet File Detected:</strong> Data will be imported into forensic
                sidecar tables (app.kismet_*) automatically.
              </div>
            )}

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Source Tag / Session ID <span className="text-slate-500">(unique identifier)</span>
              </label>
              <SourceTagInput value={sourceTag} onChange={setSourceTag} disabled={isLoading} />
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={backupEnabled}
                onChange={(e) => setBackupEnabled(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 rounded accent-orange-500"
              />
              <span className="text-xs text-slate-400">Back up database before importing</span>
            </label>

            <label className="block">
              <input
                id="sqlite-upload"
                type="file"
                accept=".sqlite,.db,.sqlite3,.kismet"
                onChange={handleFileSelectionChange}
                disabled={!canImport}
                className="hidden"
              />
              <div
                className={`px-4 py-2.5 rounded-lg font-medium text-sm text-center transition-all text-white bg-gradient-to-r ${
                  showKismetSuggestion
                    ? 'from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600'
                    : 'from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600'
                } ${canImport ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                onClick={() => canImport && document.getElementById('sqlite-upload')?.click()}
              >
                {isLoading
                  ? importStatus.startsWith('Running')
                    ? 'Backing up...'
                    : 'Importing...'
                  : `Choose ${showKismetSuggestion ? 'Kismet' : 'SQLite'} File`}
              </div>
            </label>

            {importStatus && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  importStatus.startsWith('Imported') || importStatus.includes('Complete')
                    ? 'bg-green-900/30 text-green-300 border border-green-700/50'
                    : 'bg-red-900/30 text-red-300 border border-red-700/50'
                }`}
              >
                {importStatus}
              </div>
            )}
          </div>
        </AdminCard>

        {/* SQL Import */}
        <AdminCard icon={UploadIcon} title="SQL Import" color="from-green-500 to-green-600">
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Upload and execute a PostgreSQL SQL script directly on EC2.
            </p>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={backupEnabled}
                onChange={(e) => setBackupEnabled(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 rounded accent-green-500"
              />
              <span className="text-xs text-slate-400">Back up database before SQL import</span>
            </label>

            <label className="block">
              <input
                id="sql-upload"
                type="file"
                accept=".sql"
                onChange={handleSqlFileImport}
                disabled={isLoading}
                className="hidden"
              />
              <div
                className={`px-4 py-2.5 rounded-lg font-medium text-sm text-center transition-all text-white bg-gradient-to-r from-green-600 to-green-700 ${
                  isLoading
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:from-green-500 hover:to-green-600 cursor-pointer'
                }`}
                onClick={() => !isLoading && document.getElementById('sql-upload')?.click()}
              >
                {isLoading
                  ? sqlImportStatus.startsWith('Running')
                    ? 'Backing up...'
                    : 'Running SQL...'
                  : 'Choose SQL File'}
              </div>
            </label>

            {sqlImportStatus && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  sqlImportStatus.toLowerCase().includes('complete')
                    ? 'bg-green-900/30 text-green-300 border border-green-700/50'
                    : 'bg-red-900/30 text-red-300 border border-red-700/50'
                }`}
              >
                {sqlImportStatus}
              </div>
            )}

            <div className="text-xs text-slate-500 pt-2 border-t border-slate-700/50">
              <p>Accepted file type: `.sql`</p>
              <p>Executed with `psql -v ON_ERROR_STOP=1`.</p>
            </div>
          </div>
        </AdminCard>
      </div>

      {lastResult?.metricsBefore && lastResult?.metricsAfter && (
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-1">Last Import Audit</h3>
          <p className="text-xs text-slate-500 mb-3">
            Source:{' '}
            <span className="font-mono">
              {lastResult.sourceTag || lastResult.source_tag || sourceTag || 'sql_upload'}
            </span>
            {lastResult.importType ? (
              <>
                {' '}
                · Type: <span className="font-mono">{String(lastResult.importType)}</span>
              </>
            ) : null}
            {lastResult.durationSec ? (
              <>
                {' '}
                · Duration: <span className="font-mono">{lastResult.durationSec}s</span>
              </>
            ) : null}
            {typeof lastResult.backupTaken === 'boolean' ? (
              <>
                {' '}
                · Backup: <span className="font-mono">{lastResult.backupTaken ? 'yes' : 'no'}</span>
              </>
            ) : null}
          </p>
          <MetricsTable before={lastResult.metricsBefore} after={lastResult.metricsAfter} />
        </div>
      )}

      {/* Import History */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">
          Import History{' '}
          <span className="text-slate-500 font-normal text-xs">— click a row for details</span>
        </h3>
        <ImportHistory refreshKey={historyKey} />
      </div>
    </div>
  );
};

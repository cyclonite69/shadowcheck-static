import React, { useEffect, useState } from 'react';
import { useDataImport } from '../hooks/useDataImport';
import { ImportHistory } from './data-import/ImportHistory';
import { KmlImportCard } from './data-import/KmlImportCard';
import { LastImportAudit } from './data-import/LastImportAudit';
import { OrphanNetworksPanel } from './data-import/OrphanNetworksPanel';
import { SQLiteImportCard } from './data-import/SQLiteImportCard';
import { SqlImportCard } from './data-import/SqlImportCard';
import { useWigleRuns } from '../hooks/useWigleRuns';
import { AdminCard } from '../components/AdminCard';

const BadgeIcon = ({ size = 24, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
  </svg>
);

export const DataImportTab: React.FC = () => {
  const {
    isLoading,
    importStatus,
    sqlImportStatus,
    kmlImportStatus,
    lastResult,
    sourceTag,
    setSourceTag,
    backupEnabled,
    setBackupEnabled,
    handleFileImport,
    handleSqlFileImport,
    handleKmlImport,
  } = useDataImport();
  const [historyKey, setHistoryKey] = useState(0);

  const { report } = useWigleRuns({ limit: 1 });

  useEffect(() => {
    if (!isLoading && (importStatus || sqlImportStatus || kmlImportStatus)) {
      setHistoryKey((k) => k + 1);
    }
  }, [isLoading, importStatus, sqlImportStatus, kmlImportStatus]);

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
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 gap-4">
        <SQLiteImportCard
          backupEnabled={backupEnabled}
          canImport={canImport}
          importStatus={importStatus}
          isLoading={isLoading}
          onFileChange={handleFileSelectionChange}
          onToggleBackup={setBackupEnabled}
          setSourceTag={setSourceTag}
          showKismetSuggestion={showKismetSuggestion}
          sourceTag={sourceTag}
        />
        <SqlImportCard
          backupEnabled={backupEnabled}
          isLoading={isLoading}
          onFileChange={handleSqlFileImport}
          onToggleBackup={setBackupEnabled}
          sqlImportStatus={sqlImportStatus}
        />
        <KmlImportCard
          isLoading={isLoading}
          kmlImportStatus={kmlImportStatus}
          onFilesChange={(event) => handleKmlImport(event, 'files')}
          onFolderChange={(event) => handleKmlImport(event, 'folder')}
        />
      </div>

      {report && (
        <AdminCard icon={BadgeIcon} title="Completeness Status" color="from-amber-500 to-amber-600">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase mb-3 flex items-center justify-between">
              <span>Coverage Snapshot</span>
              <span className="text-[10px] text-slate-500 font-normal">
                Updated: {new Date(report.generatedAt).toLocaleTimeString()}
              </span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {report.states
                ?.filter((s) => s.storedCount > 0 || s.runId)
                .slice(0, 15)
                .map((s) => (
                  <div
                    key={s.state}
                    className="p-2 bg-slate-900/40 rounded border border-slate-800/60 flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-black text-white">{s.state}</span>
                      <span
                        className={`text-[9px] px-1 rounded ${
                          s.status === 'completed'
                            ? 'text-emerald-400 bg-emerald-500/5'
                            : s.status === 'failed'
                              ? 'text-red-400 bg-red-500/5'
                              : s.status === 'running'
                                ? 'text-blue-400 bg-blue-500/5'
                                : 'text-slate-600'
                        }`}
                      >
                        {s.status === 'completed' ? '✓' : s.status ? '...' : ''}
                      </span>
                    </div>
                    <div className="text-lg font-bold text-slate-100">
                      {s.storedCount.toLocaleString()}
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase font-semibold">
                      Networks
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </AdminCard>
      )}

      {lastResult && <LastImportAudit lastResult={lastResult} sourceTag={sourceTag} />}

      <OrphanNetworksPanel refreshKey={historyKey} />

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

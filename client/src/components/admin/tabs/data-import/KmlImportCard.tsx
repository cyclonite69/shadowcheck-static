import React from 'react';
import { AdminCard } from '../../components/AdminCard';
import { UploadIcon } from './UploadIcon';
import { ImportStatusMessage } from './ImportStatusMessage';
import { FileImportButton } from './FileImportButton';
import type {
  KmlImportStatusResponse,
  WigleKmlSyncStatusResponse,
} from '../../../../types/kmlImport';
import { adminApi } from '../../../../api/adminApi';

interface KmlImportCardProps {
  isLoading: boolean;
  kmlImports: KmlImportStatusResponse | null;
  kmlImportsError: string | null;
  kmlImportsLoading: boolean;
  kmlImportStatus: string;
  onFilesChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFolderChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRefreshImports: () => void;
}

const formatNumber = (value: number | null | undefined) => Number(value || 0).toLocaleString();

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'None';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export const KmlImportCard = ({
  isLoading,
  kmlImports,
  kmlImportsError,
  kmlImportsLoading,
  kmlImportStatus,
  onFilesChange,
  onFolderChange,
  onRefreshImports,
}: KmlImportCardProps) => {
  const [syncStatus, setSyncStatus] = React.useState<WigleKmlSyncStatusResponse | null>(null);
  const [syncStatusLoading, setSyncStatusLoading] = React.useState(false);
  const [syncStatusError, setSyncStatusError] = React.useState<string | null>(null);

  const fetchSyncStatus = React.useCallback(async () => {
    try {
      setSyncStatusLoading(true);
      setSyncStatusError(null);
      const res = await adminApi.getWigleKmlSyncStatus();
      setSyncStatus(res);
    } catch (err) {
      setSyncStatusError(err instanceof Error ? err.message : 'Failed to fetch WiGLE sync status');
    } finally {
      setSyncStatusLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchSyncStatus();
  }, [fetchSyncStatus]);

  return (
    <AdminCard icon={UploadIcon} title="KML Import" color="from-sky-500 to-cyan-600">
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Upload WiGLE KML exports into staged `app.kml_*` tables and copy the raw files to S3 for
          later reconciliation.
        </p>

        <div className="grid grid-cols-1 gap-3">
          <FileImportButton
            id="kml-upload-files"
            accept=".kml"
            onChange={onFilesChange}
            disabled={isLoading}
            isLoading={isLoading}
            loadingText="Uploading KML..."
            idleText="Choose KML Files"
            activeColorClass="from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600"
            multiple
          />

          <FileImportButton
            id="kml-upload-folder"
            accept=".kml"
            onChange={onFolderChange}
            disabled={isLoading}
            isLoading={isLoading}
            loadingText="Uploading Folder..."
            idleText="Choose KML Folder"
            activeColorClass="from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600"
            multiple
            directory
          />
        </div>

        <ImportStatusMessage status={kmlImportStatus} />

        <div className="border-t border-slate-700/50 pt-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h4 className="text-sm font-semibold text-slate-300">Imported KMLs</h4>
            <button
              type="button"
              onClick={onRefreshImports}
              disabled={kmlImportsLoading}
              className="text-xs text-sky-300 hover:text-sky-200 disabled:text-slate-500"
            >
              {kmlImportsLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {kmlImportsError ? (
            <p className="text-xs text-red-300">{kmlImportsError}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-500">Files</p>
                  <p className="font-mono text-slate-200">
                    {formatNumber(kmlImports?.totals.file_count)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Points</p>
                  <p className="font-mono text-slate-200">
                    {formatNumber(kmlImports?.totals.point_count)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">WiGLE files</p>
                  <p className="font-mono text-slate-200">
                    {formatNumber(kmlImports?.totals.wigle_file_count)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Latest</p>
                  <p className="font-mono text-slate-200">
                    {formatDate(kmlImports?.totals.latest_imported_at)}
                  </p>
                </div>
              </div>

              <div className="mt-3 max-h-56 overflow-auto rounded border border-slate-700/50">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="sticky top-0 bg-slate-900 text-slate-400">
                    <tr>
                      <th className="px-2 py-2 font-medium">Source file</th>
                      <th className="px-2 py-2 font-medium">Type</th>
                      <th className="px-2 py-2 font-medium text-right">Placemarks</th>
                      <th className="px-2 py-2 font-medium text-right">Points</th>
                      <th className="px-2 py-2 font-medium">Hash</th>
                      <th className="px-2 py-2 font-medium">Imported</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {(kmlImports?.files || []).slice(0, 25).map((file) => (
                      <tr key={file.id} className="text-slate-300">
                        <td className="px-2 py-2 font-mono text-[11px]">{file.source_file}</td>
                        <td className="px-2 py-2">{file.source_type || 'kml'}</td>
                        <td className="px-2 py-2 text-right font-mono">
                          {formatNumber(file.placemark_count)}
                        </td>
                        <td className="px-2 py-2 text-right font-mono">
                          {formatNumber(file.point_count)}
                        </td>
                        <td className="px-2 py-2 font-mono">{file.hash_prefix || 'none'}</td>
                        <td className="px-2 py-2 font-mono text-[11px]">
                          {formatDate(file.imported_at)}
                        </td>
                      </tr>
                    ))}
                    {!kmlImports?.files?.length ? (
                      <tr>
                        <td className="px-2 py-4 text-center text-slate-500" colSpan={6}>
                          No KML imports found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-slate-700/50 pt-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-slate-300">WiGLE Remote Sync</h4>
            <button
              type="button"
              onClick={fetchSyncStatus}
              disabled={syncStatusLoading}
              className="text-xs text-sky-300 hover:text-sky-200 disabled:text-slate-500"
            >
              {syncStatusLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {syncStatusError ? (
            <p className="text-xs text-red-300">{syncStatusError}</p>
          ) : syncStatus ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-500">Credentials</p>
                  <p
                    className={`font-semibold ${syncStatus.configured ? 'text-emerald-400' : 'text-amber-400'}`}
                  >
                    {syncStatus.configured ? 'Configured' : 'Missing'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Remote Listing</p>
                  <p className="font-semibold text-rose-400">Unsupported</p>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed bg-slate-800/40 p-2.5 rounded border border-slate-800">
                ShadowCheck has not found a documented WiGLE API endpoint for listing/downloading
                uploaded KML/KMZ artifacts. Manual upload/import remains the supported path.
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled
                  title="WiGLE remote KML listing is unsupported in this version"
                  className="px-3 py-1.5 bg-slate-800 text-slate-500 border border-slate-700/50 text-xs rounded cursor-not-allowed flex-1"
                >
                  Check WiGLE
                </button>
                <button
                  type="button"
                  disabled
                  title="WiGLE remote KML sync is unsupported in this version"
                  className="px-3 py-1.5 bg-slate-800 text-slate-500 border border-slate-700/50 text-xs rounded cursor-not-allowed flex-1"
                >
                  Sync now
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Loading sync status...</p>
          )}
        </div>

        <div className="text-xs text-slate-500 pt-2 border-t border-slate-700/50">
          <p>Accepted file type: `.kml`</p>
          <p>Files are staged into `app.kml_files` and `app.kml_points`.</p>
        </div>
      </div>
    </AdminCard>
  );
};

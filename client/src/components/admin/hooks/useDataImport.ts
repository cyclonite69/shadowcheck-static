import { useState } from 'react';
import { adminApi } from '../../../api/adminApi';

export const useDataImport = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [sourceTag, setSourceTag] = useState('');
  const [backupEnabled, setBackupEnabled] = useState(true);
  const [lastResult, setLastResult] = useState<any>(null);

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!sourceTag.trim()) {
      setImportStatus('Error: Please enter a source tag before choosing a file.');
      return;
    }

    const formData = new FormData();
    formData.append('database', file);
    formData.append('source_tag', sourceTag.trim());
    formData.append('backup', String(backupEnabled));

    try {
      setIsLoading(true);
      setLastResult(null);
      setImportStatus(
        backupEnabled ? 'Running pre-import backup...' : 'Uploading and importing...'
      );
      const result = await adminApi.importSQLite(formData);
      setLastResult(result);
      setImportStatus(
        result.ok
          ? `Imported ${(result.imported ?? 0).toLocaleString()} observations (${result.failed ?? 0} failed)`
          : `Failed: ${result.error || 'Unknown error'}`
      );
    } catch {
      setImportStatus('Import failed: Network error');
    } finally {
      setIsLoading(false);
      event.target.value = '';
    }
  };

  return {
    isLoading,
    importStatus,
    sourceTag,
    setSourceTag,
    backupEnabled,
    setBackupEnabled,
    lastResult,
    handleFileImport,
  };
};

import { useState } from 'react';
import { adminApi } from '../../../api/adminApi';

export const useDataImport = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [sourceTag, setSourceTag] = useState('');

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

    try {
      setIsLoading(true);
      setImportStatus('Uploading and importing (this may take a minute)...');
      const result = await adminApi.importSQLite(formData);
      setImportStatus(
        result.ok
          ? `Imported ${(result.imported ?? 0).toLocaleString()} observations (${result.failed ?? 0} failed) — source: ${sourceTag.trim()}`
          : `Failed: ${result.error || 'Unknown error'}`
      );
    } catch {
      setImportStatus('Import failed: Network error');
    } finally {
      setIsLoading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return {
    isLoading,
    importStatus,
    sourceTag,
    setSourceTag,
    handleFileImport,
  };
};

export type ImportHistoryStatus = 'running' | 'success' | 'failed' | 'quarantined';

export function getImportHistoryStatusMeta(status: ImportHistoryStatus): {
  className: string;
  label: string;
} {
  if (status === 'success') {
    return { className: 'text-green-400', label: '✓ success' };
  }
  if (status === 'failed') {
    return { className: 'text-red-400', label: '✗ failed' };
  }
  if (status === 'quarantined') {
    return { className: 'text-amber-400', label: '⚠ Quarantined' };
  }
  return { className: 'text-yellow-400', label: '⏳ running' };
}

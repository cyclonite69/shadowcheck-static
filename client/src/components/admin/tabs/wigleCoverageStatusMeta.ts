export function getCoverageStatusMeta(
  status: string | null,
  rowsInserted: number | null | undefined
) {
  if (status === 'completed' && (rowsInserted ?? 0) === 0) {
    return {
      className: 'text-amber-400 bg-amber-500/5',
      label: '!',
      title: 'Completed with 0 imported rows',
    };
  }
  if (status === 'completed') {
    return {
      className: 'text-emerald-400 bg-emerald-500/5',
      label: '✓',
      title: 'Completed',
    };
  }
  if (status === 'failed') {
    return {
      className: 'text-red-400 bg-red-500/5',
      label: '✕ Failed',
      title: 'Failed',
    };
  }
  if (status === 'running') {
    return {
      className: 'text-blue-400 bg-blue-500/5',
      label: '…',
      title: 'Running',
    };
  }
  if (status === 'paused') {
    return {
      className: 'text-amber-300 bg-amber-500/10',
      label: '⏸ Paused',
      title: 'Paused',
    };
  }
  if (status === 'cancelled') {
    return {
      className: 'text-slate-300 bg-slate-500/10',
      label: '✕ Cancelled',
      title: 'Cancelled',
    };
  }
  return {
    className: 'text-slate-600',
    label: status ? '…' : '',
    title: status || '',
  };
}

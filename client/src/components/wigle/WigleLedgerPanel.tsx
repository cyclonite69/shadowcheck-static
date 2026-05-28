import { useCallback, useEffect, useRef, useState } from 'react';
import { wigleApi, type LedgerRow } from '../../api/wigleApi';
import { formatShortDate, formatISODate } from '../../utils/formatDate';

const STATUS_FILTERS = ['all', 'success', 'error', 'rate_limited', 'skipped'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_BADGE: Record<string, string> = {
  success: 'bg-green-900/60 text-green-300 border border-green-700/40',
  error: 'bg-red-900/60 text-red-300 border border-red-700/40',
  rate_limited: 'bg-amber-900/60 text-amber-300 border border-amber-700/40',
  skipped: 'bg-slate-700/60 text-slate-400 border border-slate-600/40',
};

const SOURCE_BADGE: Record<string, string> = {
  import: 'bg-blue-900/60 text-blue-300 border border-blue-700/40',
  event: 'bg-slate-700/60 text-slate-400 border border-slate-600/40',
};

function fmtDuration(ms?: number) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function WigleLedgerPanel() {
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const atTop = useRef(true);

  const load = useCallback(
    async (reset = false) => {
      if (loading) return;
      setLoading(true);
      setError(null);
      try {
        const cursor =
          !reset && rows.length > 0
            ? { before: rows[rows.length - 1].timestamp, beforeId: rows[rows.length - 1].id }
            : {};
        const result = await wigleApi.getLedger({ status: statusFilter, ...cursor });
        setRows((prev) => (reset ? result.rows : [...prev, ...result.rows]));
        setHasMore(result.hasMore);
      } catch (e: any) {
        setError(e.message || 'Failed to load ledger');
      } finally {
        setLoading(false);
      }
    },
    [loading, rows, statusFilter]
  );

  // Load on open or filter change
  useEffect(() => {
    if (open) load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, statusFilter]);

  // Auto-refresh every 30s when open and at top
  useEffect(() => {
    if (!open) return;
    refreshTimer.current = setInterval(() => {
      if (atTop.current) load(true);
    }, 30_000);
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, statusFilter]);

  // Infinite scroll sentinel
  useEffect(() => {
    if (!bottomRef.current || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) load(false);
      },
      { threshold: 0.1 }
    );
    obs.observe(bottomRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading, load]);

  return (
    <div className="border-t border-slate-600 bg-slate-900/95 backdrop-blur-sm shadow-lg">
      {/* Header / toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-blue-400">📋</span>
          REQUEST LEDGER
          {rows.length > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
              {rows.length}
              {hasMore ? '+' : ''}
            </span>
          )}
        </span>
        <span className="text-slate-400 text-base">{open ? '▼' : '▲'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          {/* Filter pills */}
          <div className="flex gap-2 mb-3 flex-wrap">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700/60 text-slate-400 hover:bg-slate-600/60'
                }`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Table */}
          <div
            className="overflow-auto max-h-72 rounded border border-slate-700/50"
            onScroll={(e) => {
              atTop.current = (e.currentTarget as HTMLDivElement).scrollTop < 40;
            }}
          >
            {error && <div className="p-4 text-red-400 text-xs">{error}</div>}
            {!error && rows.length === 0 && !loading && (
              <div className="p-6 text-center text-slate-500 text-xs">No entries yet</div>
            )}
            {rows.length > 0 && (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-800 text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Timestamp</th>
                    <th className="px-3 py-2 text-left font-semibold">Source</th>
                    <th className="px-3 py-2 text-left font-semibold">Kind</th>
                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                    <th className="px-3 py-2 text-right font-semibold">Records</th>
                    <th className="px-3 py-2 text-right font-semibold">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-slate-700/30 hover:bg-slate-800/40"
                      title={row.error || undefined}
                    >
                      <td
                        className="px-3 py-1.5 text-slate-400 whitespace-nowrap font-mono"
                        title={formatISODate(row.timestamp)}
                      >
                        {formatShortDate(row.timestamp)}
                      </td>
                      <td className="px-3 py-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${SOURCE_BADGE[row.source] ?? ''}`}
                        >
                          {row.source}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-slate-300 max-w-[160px] truncate">
                        {row.kind || '—'}
                      </td>
                      <td className="px-3 py-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_BADGE[row.status] ?? ''}`}
                        >
                          {row.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right text-slate-400 font-mono">
                        {row.rowsInserted != null ? row.rowsInserted.toLocaleString() : '—'}
                      </td>
                      <td className="px-3 py-1.5 text-right text-slate-400 font-mono">
                        {fmtDuration(row.durationMs)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {/* Infinite scroll sentinel */}
            {hasMore && <div ref={bottomRef} className="h-4" />}
            {loading && (
              <div className="flex justify-center py-3">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import type { MVStat } from '../../hooks/useDbStats';
import { formatShortDate } from '../../../../utils/formatDate';

export interface DbMaterializedViewsListProps {
  mvs: MVStat[];
}

export const DbMaterializedViewsList: React.FC<DbMaterializedViewsListProps> = ({ mvs }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-xs text-left border-collapse">
      <thead>
        <tr className="text-slate-500 border-b border-slate-800">
          <th className="py-2 pr-4 font-semibold uppercase tracking-wider">View Name</th>
          <th className="py-2 px-4 font-semibold uppercase tracking-wider text-center">Status</th>
          <th className="py-2 px-4 font-semibold uppercase tracking-wider text-right">Size</th>
          <th className="py-2 px-4 font-semibold uppercase tracking-wider text-right">
            Scans (Seq)
          </th>
          <th className="py-2 px-4 font-semibold uppercase tracking-wider text-right">
            Tuples Read
          </th>
          <th className="py-2 pl-4 font-semibold uppercase tracking-wider text-right">
            Last Active
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800/50">
        {mvs.map((mv) => (
          <tr key={mv.view_name} className="hover:bg-slate-800/30 transition-colors">
            <td className="py-2 pr-4 font-mono text-emerald-400 font-medium">{mv.view_name}</td>
            <td className="py-2 px-4 text-center">
              {mv.is_populated ? (
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
                  POPULATED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-500 font-bold border border-red-500/20 animate-pulse">
                  UNPOPULATED
                </span>
              )}
            </td>
            <td className="py-2 px-4 text-right tabular-nums text-slate-400 font-medium">
              {mv.size_pretty}
            </td>
            <td className="py-2 px-4 text-right tabular-nums text-purple-400">
              {parseInt(mv.seq_scan || '0').toLocaleString()}
            </td>
            <td className="py-2 px-4 text-right tabular-nums text-slate-500">
              {parseInt(mv.seq_tup_read || '0').toLocaleString()}
            </td>
            <td className="py-2 pl-4 text-right whitespace-nowrap text-slate-500">
              {mv.last_active ? formatShortDate(mv.last_active) : 'Never'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

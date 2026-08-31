import React from 'react';
import type { TableStat } from '../../hooks/useDbStats';
import { formatShortDate } from '../../../../utils/formatDate';

export interface DbTableListProps {
  tables: TableStat[];
}

export const DbTableList: React.FC<DbTableListProps> = ({ tables }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-xs text-left border-collapse">
      <thead>
        <tr className="text-slate-500 border-b border-slate-800">
          <th className="py-2 pr-4 font-semibold uppercase tracking-wider">Table Name</th>
          <th className="py-2 px-4 font-semibold uppercase tracking-wider text-right">Rows</th>
          <th className="py-2 px-4 font-semibold uppercase tracking-wider text-right">Size</th>
          <th className="py-2 px-4 font-semibold uppercase tracking-wider text-right">
            Writes (I/U)
          </th>
          <th className="py-2 px-4 font-semibold uppercase tracking-wider text-right">
            Reads (Idx/Seq)
          </th>
          <th className="py-2 pl-4 font-semibold uppercase tracking-wider text-right">
            Last Active
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800/50">
        {tables.map((t) => {
          const hasActivity = parseInt(t.total_inserts) > 0 || parseInt(t.total_updates) > 0;
          return (
            <tr
              key={t.table_name}
              className={`hover:bg-slate-800/30 transition-colors ${hasActivity ? 'bg-blue-500/5' : ''}`}
            >
              <td className="py-2 pr-4 font-mono text-blue-400 font-medium">{t.table_name}</td>
              <td className="py-2 px-4 text-right tabular-nums text-slate-300">
                {parseInt(t.row_count).toLocaleString()}
              </td>
              <td className="py-2 px-4 text-right tabular-nums text-slate-400 font-medium">
                {t.size_pretty}
              </td>
              <td className="py-2 px-4 text-right tabular-nums">
                <span className="text-emerald-500">
                  {parseInt(t.total_inserts).toLocaleString()}
                </span>
                <span className="text-slate-600 mx-1">/</span>
                <span className="text-blue-400">{parseInt(t.total_updates).toLocaleString()}</span>
              </td>
              <td className="py-2 px-4 text-right tabular-nums">
                <span className="text-purple-400">{parseInt(t.index_reads).toLocaleString()}</span>
                <span className="text-slate-600 mx-1">/</span>
                <span className="text-slate-500">
                  {parseInt(t.sequential_reads).toLocaleString()}
                </span>
              </td>
              <td className="py-2 pl-4 text-right whitespace-nowrap text-slate-500">
                {t.last_active ? formatShortDate(t.last_active) : 'Never'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

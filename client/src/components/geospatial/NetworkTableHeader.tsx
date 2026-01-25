import React from 'react';
import type { NetworkRow, SortState } from '../../types/network';
import { API_SORT_MAP, NETWORK_COLUMNS } from '../../constants/network';

interface NetworkTableHeaderProps {
  visibleColumns: Array<keyof NetworkRow | 'select'>;
  sort: SortState[];
  allSelected: boolean;
  someSelected: boolean;
  onToggleSelectAll: () => void;
  onColumnSort: (column: keyof NetworkRow, multi: boolean) => void;
}

export const NetworkTableHeader = ({
  visibleColumns,
  sort,
  allSelected,
  someSelected,
  onToggleSelectAll,
  onColumnSort,
}: NetworkTableHeaderProps) => {
  return (
    <table
      style={{
        width: '100%',
        tableLayout: 'fixed',
        borderCollapse: 'separate',
        borderSpacing: 0,
        fontSize: '11px',
      }}
    >
      <thead>
        <tr style={{ borderBottom: '1px solid rgba(71, 85, 105, 0.3)' }}>
          {visibleColumns.map((col) => {
            const column = NETWORK_COLUMNS[col as keyof typeof NETWORK_COLUMNS];
            // CRASH-PROOF: Skip unknown columns (stale localStorage keys)
            if (!column) return null;
            const sortIndex = sort.findIndex((s) => s.column === col);
            const sortState = sortIndex >= 0 ? sort[sortIndex] : null;
            const isSortable =
              col !== 'select' && Boolean(API_SORT_MAP[col as keyof NetworkRow]) && column.sortable;

            return (
              <th
                key={col}
                scope="col"
                onClick={(e) => isSortable && onColumnSort(col as keyof NetworkRow, e.shiftKey)}
                style={{
                  width: column.width,
                  minWidth: column.width,
                  maxWidth: column.width,
                  padding: '5px 8px',
                  background: sortState ? 'rgba(59, 130, 246, 0.15)' : 'rgba(15, 23, 42, 0.98)',
                  backdropFilter: 'blur(8px)',
                  textAlign: 'left',
                  color: sortState ? '#93c5fd' : '#e2e8f0',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  fontSize: '11px',
                  borderRight: '1px solid rgba(71, 85, 105, 0.2)',
                  borderBottom: '1px solid rgba(71, 85, 105, 0.4)',
                  cursor: isSortable ? 'pointer' : 'default',
                  userSelect: 'none',
                  position: 'relative',
                  boxSizing: 'border-box',
                }}
                title={
                  isSortable
                    ? 'Click to sort (Shift+click for multi-sort)'
                    : col === 'select'
                      ? undefined
                      : 'Sorting unavailable (API does not support this column)'
                }
              >
                {col === 'select' ? (
                  <input
                    type="checkbox"
                    checked={allSelected}
                    aria-label="Select all rows"
                    title="Select all rows"
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={onToggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>{column.label}</span>
                    {sortState && (
                      <span style={{ fontSize: '10px', opacity: 0.8 }}>
                        {sortState.direction === 'asc' ? '↑' : '↓'}
                        {sort.length > 1 && <sup>{sortIndex + 1}</sup>}
                      </span>
                    )}
                  </div>
                )}
              </th>
            );
          })}
        </tr>
      </thead>
    </table>
  );
};

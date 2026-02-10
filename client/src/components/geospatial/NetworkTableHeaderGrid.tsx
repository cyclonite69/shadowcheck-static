import { useState, useRef } from 'react';
import type { NetworkRow, SortState } from '../../types/network';
import { API_SORT_MAP, NETWORK_COLUMNS } from '../../constants/network';

interface NetworkTableHeaderGridProps {
  visibleColumns: Array<keyof NetworkRow | 'select'>;
  sort: SortState[];
  allSelected: boolean;
  someSelected: boolean;
  onToggleSelectAll: () => void;
  onColumnSort: (column: keyof NetworkRow, shiftKey: boolean) => void;
}

export const NetworkTableHeaderGrid = ({
  visibleColumns,
  sort,
  allSelected,
  someSelected,
  onToggleSelectAll,
  onColumnSort,
}: NetworkTableHeaderGridProps) => {
  // Build grid template columns - MUST match NetworkTableBodyGrid exactly
  const gridTemplateColumns = visibleColumns
    .map((col) => {
      if (col === 'select') return '40px';
      const widths: Record<string, string> = {
        type: '60px',
        ssid: '150px',
        bssid: '140px',
        threat: '80px',
        signal: '90px',
        security: '100px',
        observations: '110px',
        distance: '100px',
        maxDist: '100px',
        threatScore: '110px',
        frequency: '90px',
        channel: '80px',
        manufacturer: '120px',
      };
      return widths[col] || '100px';
    })
    .join(' ');

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns,
        alignItems: 'center',
        borderBottom: '1px solid rgba(71, 85, 105, 0.3)',
        padding: '8px',
        fontSize: '11px',
        fontWeight: 600,
        color: '#cbd5e1',
        background: 'rgba(15, 23, 42, 0.5)',
      }}
    >
      {visibleColumns.map((col) => {
        const column = NETWORK_COLUMNS[col as keyof typeof NETWORK_COLUMNS];
        if (!column) return null;

        const sortIndex = sort.findIndex((s) => s.column === col);
        const sortState = sortIndex >= 0 ? sort[sortIndex] : null;
        const isSortable =
          col !== 'select' && Boolean(API_SORT_MAP[col as keyof NetworkRow]) && column.sortable;

        // Select all checkbox
        if (col === 'select') {
          return (
            <div key={col} style={{ padding: '0 4px' }}>
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => el && (el.indeterminate = someSelected && !allSelected)}
                onChange={onToggleSelectAll}
                style={{ cursor: 'pointer' }}
              />
            </div>
          );
        }

        return (
          <div
            key={col}
            style={{
              padding: '0 4px',
              cursor: isSortable ? 'pointer' : 'default',
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            onClick={
              isSortable ? (e) => onColumnSort(col as keyof NetworkRow, e.shiftKey) : undefined
            }
          >
            <span>{column.label}</span>
            {sortState && (
              <span style={{ fontSize: '10px', color: '#60a5fa' }}>
                {sortState.direction === 'asc' ? '↑' : '↓'}
                {sort.length > 1 && <span style={{ fontSize: '8px' }}>{sortIndex + 1}</span>}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

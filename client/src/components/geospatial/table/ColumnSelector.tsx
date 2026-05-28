import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { NetworkRow } from '../../../types/network';
import type { NetworkColumnConfig } from '../../../constants/network';
import { useColumnSelectorPosition, type MenuPosition } from '../hooks/useColumnSelectorPosition';
import { ColumnItem } from './ColumnItem';

interface ColumnSelectorProps {
  visible: boolean;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  visibleColumns: Array<keyof NetworkRow | 'select'>;
  columns: Partial<Record<keyof NetworkRow | 'select', NetworkColumnConfig>>;
  onToggle: () => void;
  onToggleColumn: (col: keyof NetworkRow | 'select') => void;
  onMoveColumn: (col: keyof NetworkRow | 'select', direction: 'left' | 'right') => void;
}

/**
 * Encapsulated portal content for the column selector menu
 */
const ColumnSelectorPortal: React.FC<{
  position: MenuPosition;
  orderedColumns: Array<readonly [keyof NetworkRow | 'select', NetworkColumnConfig]>;
  visibleColumns: Array<keyof NetworkRow | 'select'>;
  onToggleColumn: (col: keyof NetworkRow | 'select') => void;
  onMoveColumn: (col: keyof NetworkRow | 'select', direction: 'left' | 'right') => void;
}> = ({ position, orderedColumns, visibleColumns, onToggleColumn, onMoveColumn }) => {
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        background: 'rgba(30, 41, 59, 0.95)',
        border: '1px solid rgba(71, 85, 105, 0.5)',
        borderRadius: '6px',
        zIndex: 10000,
        minWidth: '240px',
        width: `${position.width}px`,
        maxHeight: `${position.maxHeight}px`,
        overflowY: 'auto',
        backdropFilter: 'blur(8px)',
        overscrollBehavior: 'contain',
        boxShadow: '0 16px 40px rgba(2, 6, 23, 0.55)',
      }}
      onWheel={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid rgba(71, 85, 105, 0.5)',
          background: 'rgba(15, 23, 42, 0.95)',
          borderTopLeftRadius: '6px',
          borderTopRightRadius: '6px',
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}
      >
        <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>Columns</span>
        <button
          onClick={() => {
            localStorage.removeItem('shadowcheck_visible_columns');
            window.location.reload();
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#60a5fa',
            fontSize: '11px',
            cursor: 'pointer',
            padding: '2px 4px',
            fontWeight: 500,
          }}
          title="Reset to default columns and order"
        >
          Reset Layout
        </button>
      </div>
      <div style={{ padding: '4px 0' }}>
        {orderedColumns.map(([col, column]) => {
          const isVisible = visibleColumns.includes(col);
          const colIndex = isVisible ? visibleColumns.indexOf(col) : -1;

          return (
            <ColumnItem
              key={String(col)}
              columnKey={col}
              columnConfig={column}
              isVisible={isVisible}
              isFirst={colIndex === 0}
              isLast={colIndex === visibleColumns.length - 1}
              onToggle={onToggleColumn}
              onMove={onMoveColumn}
            />
          );
        })}
      </div>
    </div>,
    document.body
  );
};

export const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  visible,
  anchorRef,
  visibleColumns,
  columns,
  onToggle,
  onToggleColumn,
  onMoveColumn,
}) => {
  const menuPosition = useColumnSelectorPosition(visible, anchorRef);

  const orderedColumns = useMemo(() => {
    const visibleSet = new Set(visibleColumns);
    const visibleEntries = visibleColumns
      .map((col) => [col, columns[col]] as const)
      .filter((entry): entry is readonly [keyof NetworkRow | 'select', NetworkColumnConfig] =>
        Boolean(entry[1])
      );

    const hiddenEntries = (
      Object.entries(columns) as Array<
        [keyof NetworkRow | 'select', NetworkColumnConfig | undefined]
      >
    ).filter((entry): entry is [keyof NetworkRow | 'select', NetworkColumnConfig] => {
      const [col, column] = entry;
      return Boolean(column) && !visibleSet.has(col);
    });

    return [...visibleEntries, ...hiddenEntries];
  }, [columns, visibleColumns]);

  return (
    <div className="relative" ref={anchorRef}>
      <button
        onClick={onToggle}
        style={{
          padding: '6px',
          background: 'transparent',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          color: '#cbd5e1',
        }}
        title="Column Settings"
      >
        ⚙️
      </button>
      {visible && (
        <ColumnSelectorPortal
          position={menuPosition}
          orderedColumns={orderedColumns}
          visibleColumns={visibleColumns}
          onToggleColumn={onToggleColumn}
          onMoveColumn={onMoveColumn}
        />
      )}
    </div>
  );
};

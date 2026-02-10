import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { NetworkRow } from '../../types/network';
import { NetworkTableEmptyState } from './NetworkTableEmptyState';
import { NetworkTableFooter } from './NetworkTableFooter';
import { NetworkTableRow } from './NetworkTableRow';

interface NetworkTableBodyProps {
  tableContainerRef: React.RefObject<HTMLDivElement>;
  visibleColumns: Array<keyof NetworkRow | 'select'>;
  loadingNetworks: boolean;
  filteredNetworks: NetworkRow[];
  error: string | null;
  selectedNetworks: Set<string>;
  onSelectExclusive: (bssid: string) => void;
  onOpenContextMenu: (event: React.MouseEvent<HTMLTableRowElement>, net: NetworkRow) => void;
  onToggleSelectNetwork: (bssid: string) => void;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export const NetworkTableBodyVirtualizedV2 = ({
  tableContainerRef,
  visibleColumns,
  loadingNetworks,
  filteredNetworks,
  error,
  selectedNetworks,
  onSelectExclusive,
  onOpenContextMenu,
  onToggleSelectNetwork,
  isLoadingMore,
  hasMore,
  onLoadMore,
}: NetworkTableBodyProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: filteredNetworks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32, // Row height in pixels
    overscan: 5,
  });

  // Show empty state if loading or no data
  if (loadingNetworks || filteredNetworks.length === 0 || error) {
    return (
      <div ref={tableContainerRef} className="flex-1 overflow-auto min-h-0">
        <table
          style={{
            width: '100%',
            tableLayout: 'fixed',
            borderCollapse: 'separate',
            borderSpacing: 0,
            fontSize: '11px',
          }}
        >
          <tbody>
            <NetworkTableEmptyState
              loading={loadingNetworks}
              empty={!loadingNetworks && filteredNetworks.length === 0}
              error={error}
              colSpan={visibleColumns.length}
            />
          </tbody>
        </table>
      </div>
    );
  }

  const items = virtualizer.getVirtualItems();

  return (
    <>
      <div ref={parentRef} className="flex-1 overflow-auto min-h-0" style={{ contain: 'strict' }}>
        <table
          style={{
            width: '100%',
            tableLayout: 'fixed',
            borderCollapse: 'separate',
            borderSpacing: 0,
            fontSize: '11px',
          }}
        >
          <tbody
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              position: 'relative',
            }}
          >
            {items.map((virtualRow) => {
              const net = filteredNetworks[virtualRow.index];
              return (
                <NetworkTableRow
                  key={net.bssid}
                  net={net}
                  index={virtualRow.index}
                  visibleColumns={visibleColumns}
                  isSelected={selectedNetworks.has(net.bssid)}
                  onSelectExclusive={onSelectExclusive}
                  onOpenContextMenu={onOpenContextMenu}
                  onToggleSelectNetwork={onToggleSelectNetwork}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                />
              );
            })}
          </tbody>
        </table>
      </div>
      <NetworkTableFooter isLoadingMore={isLoadingMore} hasMore={hasMore} onLoadMore={onLoadMore} />
    </>
  );
};

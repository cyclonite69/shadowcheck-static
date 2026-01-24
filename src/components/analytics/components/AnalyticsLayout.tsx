// ===== FILE: src/components/analytics/components/AnalyticsLayout.tsx =====
// PURPOSE: Main layout component for analytics page structure
// EXTRACTS: Layout structure from lines 988-1106 in original AnalyticsPage.tsx

import React from 'react';
import { FilterPanel } from '../../FilterPanel';
import { FilterIcon, GripHorizontal } from '../utils/chartConstants';
import { Card } from '../hooks/useCardLayout';
import { AnalyticsData } from '../hooks/useAnalyticsData';
import { AnalyticsCharts } from './AnalyticsCharts';

interface AnalyticsLayoutProps {
  cards: Card[];
  data: AnalyticsData;
  loading: boolean;
  error: string | null;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  dragging: number | null;
  resizing: number | null;
  debouncedFilterState: any;
  onMouseDown: (e: React.MouseEvent, cardId: number, mode?: 'move' | 'resize') => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
}

export const AnalyticsLayout: React.FC<AnalyticsLayoutProps> = ({
  cards,
  data,
  loading,
  error,
  showFilters,
  setShowFilters,
  dragging,
  resizing,
  debouncedFilterState,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
}) => {
  return (
    <div
      className="relative w-full overflow-hidden flex"
      style={{
        height: '100vh',
        background:
          'radial-gradient(circle at 20% 20%, rgba(52, 211, 153, 0.06), transparent 25%), radial-gradient(circle at 80% 0%, rgba(59, 130, 246, 0.06), transparent 20%), linear-gradient(135deg, #0a1525 0%, #0d1c31 40%, #0a1424 100%)',
      }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      {/* Filter Panel */}
      {showFilters && (
        <div
          className="fixed top-20 right-4 max-w-md space-y-2"
          style={{
            maxHeight: 'calc(100vh - 100px)',
            overflowY: 'auto',
            zIndex: 100000,
            pointerEvents: 'auto',
          }}
        >
          <FilterPanel density="compact" />
        </div>
      )}

      {/* Filter Icon Button - Only visible on hover in upper left */}
      <div
        className="fixed top-0 left-0 w-16 h-16 group"
        style={{
          zIndex: 100000,
          pointerEvents: 'auto',
        }}
      >
        <button
          type="button"
          aria-label={showFilters ? 'Hide filters' : 'Show filters'}
          title={showFilters ? 'Hide filters' : 'Show filters'}
          onClick={() => setShowFilters(!showFilters)}
          className="absolute top-4 left-4 w-12 h-12 rounded-lg flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
          style={{
            background: showFilters
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
              : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          }}
        >
          <FilterIcon size={24} className="text-white" />
        </button>
      </div>

      <div className="relative flex-1 overflow-y-auto" style={{ height: '100vh' }}>
        {/* Cards */}
        <div style={{ minHeight: '2700px', position: 'relative' }}>
          {cards.map((card) => {
            const Icon = card.icon;
            const width = `${card.w}%`;
            const left = `${card.x}%`;

            return (
              <div
                key={card.id}
                style={{
                  position: 'absolute',
                  left: left,
                  top: `${card.y}px`,
                  width: width,
                  height: `${card.h}px`,
                  transition:
                    dragging === card.id || resizing === card.id ? 'none' : 'box-shadow 0.2s',
                  cursor: dragging === card.id ? 'grabbing' : 'grab',
                  userSelect: dragging || resizing ? 'none' : 'auto',
                }}
                onMouseDown={(e) => onMouseDown(e, card.id, 'move')}
                className="relative overflow-hidden rounded-xl border border-[#20324d] bg-[#0f1e34]/95 shadow-[0_10px_24px_rgba(0,0,0,0.35)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.45)] transition-shadow group backdrop-blur-sm outline outline-1 outline-[#13223a]/60"
              >
                <div className="absolute inset-0 pointer-events-none opacity-10 bg-gradient-to-br from-white/8 via-white/5 to-transparent" />
                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-[#132744]/95 border-b border-[#1c3050]">
                  <div className="flex items-center gap-2">
                    <Icon size={18} className="text-blue-400" />
                    <h3 className="text-sm font-semibold text-white">{card.title}</h3>
                  </div>
                  <GripHorizontal
                    size={16}
                    className="text-white/50 group-hover:text-white transition-colors flex-shrink-0"
                  />
                </div>

                {/* Content */}
                <div className="p-4 overflow-hidden" style={{ height: `${card.h - 50}px` }}>
                  <AnalyticsCharts
                    card={card}
                    data={data}
                    loading={loading}
                    error={error}
                    debouncedFilterState={debouncedFilterState}
                    onMouseDown={onMouseDown}
                  />
                </div>

                {/* Resize Handle */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onMouseDown(e, card.id, 'resize');
                  }}
                  className="absolute bottom-0 right-0 w-8 h-8 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  style={{
                    background:
                      'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.35) 50%)',
                    borderRadius: '0 0 10px 0',
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ===== END FILE =====

import React from 'react';
import { FilterPanel } from './FilterPanel';
import { ActiveFiltersSummary } from './ActiveFiltersSummary';

interface FilterPanelWrapperProps {
  isOpen: boolean;
  adaptedFilters: any;
}

export const FilterPanelWrapper: React.FC<FilterPanelWrapperProps> = ({
  isOpen,
  adaptedFilters,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed top-20 left-4 max-w-sm bg-slate-900/40 backdrop-blur-xl rounded-xl border border-slate-700/40 shadow-2xl p-5 space-y-4 overflow-y-auto z-40 max-h-[calc(100vh-100px)] pointer-events-auto">
      <ActiveFiltersSummary adaptedFilters={adaptedFilters} compact />
      <FilterPanel density="compact" />
    </div>
  );
};

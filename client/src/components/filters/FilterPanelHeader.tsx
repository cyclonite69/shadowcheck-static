/**
 * Filter Panel Header Component
 * Displays filter count, clear/reset actions
 */

import React from 'react';

const FilterIcon = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z"
    />
  </svg>
);

interface FilterPanelHeaderProps {
  activeFilterCount: number;
  isCompact: boolean;
  onClearAll: () => void;
  onReset: () => void;
}

export const FilterPanelHeader: React.FC<FilterPanelHeaderProps> = ({
  activeFilterCount,
  isCompact,
  onClearAll,
  onReset,
}) => {
  return (
    <div className={`filter-panel__header border-b border-slate-700 ${isCompact ? 'p-3' : 'p-4'}`}>
      <div className={`flex items-center justify-between ${isCompact ? 'mb-2' : 'mb-3'}`}>
        <div className="flex items-center space-x-2">
          <FilterIcon className="filter-panel__header-icon w-5 h-5 text-slate-400" />
          <h2 className="filter-panel__title font-semibold text-slate-200">Filters</h2>
          {activeFilterCount > 0 && (
            <span className="filter-panel__badge px-2 py-1 text-xs bg-blue-600 text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={onClearAll}
          className={`bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors ${
            isCompact ? 'px-1.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
          }`}
        >
          Clear All
        </button>
        <button
          onClick={onReset}
          className={`bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors ${
            isCompact ? 'px-1.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
          }`}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

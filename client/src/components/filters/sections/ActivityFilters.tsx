/**
 * Forensic Activity & Spatial Breadth Filters
 */

import React from 'react';
import { FilterSection, FilterInput } from '../../filter';
import { NetworkFilters } from '../../../types/filters';

interface ActivityFiltersProps {
  filters: NetworkFilters;
  enabled: Record<keyof NetworkFilters, boolean>;
  isCompact: boolean;
  controlClass: string;
  onSetFilter: <K extends keyof NetworkFilters>(key: K, value: NetworkFilters[K]) => void;
  onToggleFilter: (key: keyof NetworkFilters) => void;
}

export const ActivityFilters: React.FC<ActivityFiltersProps> = ({
  filters,
  enabled,
  isCompact,
  controlClass,
  onSetFilter,
  onToggleFilter,
}) => {
  return (
    <FilterSection title="Forensic Activity" compact={isCompact}>
      <FilterInput
        label="Unique Days Active"
        enabled={enabled.uniqueDaysMin || enabled.uniqueDaysMax}
        onToggle={() => {
          onToggleFilter('uniqueDaysMin');
          onToggleFilter('uniqueDaysMax');
        }}
        compact={isCompact}
      >
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={filters.uniqueDaysMin ?? ''}
            onChange={(e) => onSetFilter('uniqueDaysMin', parseInt(e.target.value, 10))}
            placeholder="Min"
            className={controlClass}
          />
          <span className="text-slate-500">to</span>
          <input
            type="number"
            min="0"
            value={filters.uniqueDaysMax ?? ''}
            onChange={(e) => onSetFilter('uniqueDaysMax', parseInt(e.target.value, 10))}
            placeholder="Max"
            className={controlClass}
          />
        </div>
      </FilterInput>

      <FilterInput
        label="Unique Locations (100m grid)"
        enabled={enabled.uniqueLocationsMin || enabled.uniqueLocationsMax}
        onToggle={() => {
          onToggleFilter('uniqueLocationsMin');
          onToggleFilter('uniqueLocationsMax');
        }}
        compact={isCompact}
      >
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={filters.uniqueLocationsMin ?? ''}
            onChange={(e) => onSetFilter('uniqueLocationsMin', parseInt(e.target.value, 10))}
            placeholder="Min"
            className={controlClass}
          />
          <span className="text-slate-500">to</span>
          <input
            type="number"
            min="0"
            value={filters.uniqueLocationsMax ?? ''}
            onChange={(e) => onSetFilter('uniqueLocationsMax', parseInt(e.target.value, 10))}
            placeholder="Max"
            className={controlClass}
          />
        </div>
      </FilterInput>

      <FilterInput
        label="Max Mobility Distance (m)"
        enabled={enabled.maxDistanceMetersMin || enabled.maxDistanceMetersMax}
        onToggle={() => {
          onToggleFilter('maxDistanceMetersMin');
          onToggleFilter('maxDistanceMetersMax');
        }}
        compact={isCompact}
      >
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={filters.maxDistanceMetersMin ?? ''}
            onChange={(e) => onSetFilter('maxDistanceMetersMin', parseFloat(e.target.value))}
            placeholder="Min"
            className={controlClass}
          />
          <span className="text-slate-500">to</span>
          <input
            type="number"
            min="0"
            value={filters.maxDistanceMetersMax ?? ''}
            onChange={(e) => onSetFilter('maxDistanceMetersMax', parseFloat(e.target.value))}
            placeholder="Max"
            className={controlClass}
          />
        </div>
        <p className="mt-1 text-[10px] text-slate-500">
          Distance between furthest two observations.
        </p>
      </FilterInput>
    </FilterSection>
  );
};

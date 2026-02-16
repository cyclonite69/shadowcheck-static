/**
 * Data Quality Filters Section
 */

import React from 'react';
import { FilterSection, FilterInput } from '../../filter';

interface QualityFiltersProps {
  filters: any;
  enabled: any;
  isCompact: boolean;
  controlClass: string;
  onSetFilter: (key: string, value: any) => void;
  onToggleFilter: (key: string) => void;
}

export const QualityFilters: React.FC<QualityFiltersProps> = ({
  filters,
  enabled,
  isCompact,
  controlClass,
  onSetFilter,
  onToggleFilter,
}) => {
  return (
    <FilterSection title="Data Quality" compact={isCompact}>
      <FilterInput
        label="Min Observations"
        enabled={enabled.minObservations || false}
        onToggle={() => onToggleFilter('minObservations')}
        compact={isCompact}
      >
        <input
          type="number"
          value={filters.minObservations ?? ''}
          onChange={(e) => onSetFilter('minObservations', parseInt(e.target.value, 10))}
          placeholder="1"
          min="1"
          className={controlClass}
        />
      </FilterInput>

      <FilterInput
        label="Max Observations"
        enabled={enabled.maxObservations || false}
        onToggle={() => onToggleFilter('maxObservations')}
        compact={isCompact}
      >
        <input
          type="number"
          value={filters.maxObservations ?? ''}
          onChange={(e) => onSetFilter('maxObservations', parseInt(e.target.value, 10))}
          placeholder="1000"
          min="1"
          className={controlClass}
        />
      </FilterInput>

      <FilterInput
        label="Min Unique Days"
        enabled={enabled.minUniqueDays || false}
        onToggle={() => onToggleFilter('minUniqueDays')}
        compact={isCompact}
      >
        <input
          type="number"
          value={filters.minUniqueDays ?? ''}
          onChange={(e) => onSetFilter('minUniqueDays', parseInt(e.target.value, 10))}
          placeholder="1"
          min="1"
          className={controlClass}
        />
      </FilterInput>

      <FilterInput
        label="Max Unique Days"
        enabled={enabled.maxUniqueDays || false}
        onToggle={() => onToggleFilter('maxUniqueDays')}
        compact={isCompact}
      >
        <input
          type="number"
          value={filters.maxUniqueDays ?? ''}
          onChange={(e) => onSetFilter('maxUniqueDays', parseInt(e.target.value, 10))}
          placeholder="365"
          min="1"
          className={controlClass}
        />
      </FilterInput>

      <FilterInput
        label="GPS Accuracy Max (m)"
        enabled={enabled.gpsAccuracyMax || false}
        onToggle={() => onToggleFilter('gpsAccuracyMax')}
        compact={isCompact}
      >
        <input
          type="number"
          value={filters.gpsAccuracyMax ?? ''}
          onChange={(e) => onSetFilter('gpsAccuracyMax', parseInt(e.target.value, 10))}
          placeholder="100"
          min="1"
          max="10000"
          className={controlClass}
        />
      </FilterInput>

      <FilterInput
        label="Exclude Invalid Coords"
        enabled={enabled.excludeInvalidCoords || false}
        onToggle={() => onToggleFilter('excludeInvalidCoords')}
        compact={isCompact}
      >
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.excludeInvalidCoords || false}
            onChange={(e) => onSetFilter('excludeInvalidCoords', e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-xs text-slate-400">Filter out (0,0) and invalid GPS</span>
        </div>
      </FilterInput>

      <FilterInput
        label="Quality Preset"
        enabled={enabled.qualityFilter || false}
        onToggle={() => onToggleFilter('qualityFilter')}
        compact={isCompact}
      >
        <select
          value={filters.qualityFilter || 'none'}
          onChange={(e) => onSetFilter('qualityFilter', e.target.value)}
          className={controlClass}
        >
          <option value="none">None</option>
          <option value="temporal">Temporal (single-day)</option>
          <option value="extreme">Extreme (outliers)</option>
          <option value="duplicate">Duplicates</option>
          <option value="all">All Quality Checks</option>
        </select>
      </FilterInput>
    </FilterSection>
  );
};

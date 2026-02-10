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
    </FilterSection>
  );
};

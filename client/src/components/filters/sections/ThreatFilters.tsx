/**
 * Computed threat severity filters (score/level based).
 */

import React from 'react';
import { FilterSection, FilterInput } from '../../filter';
import { NetworkFilters, ThreatCategory } from '../../../types/filters';

interface ThreatFiltersProps {
  filters: NetworkFilters;
  enabled: Record<keyof NetworkFilters, boolean>;
  isCompact: boolean;
  controlClass: string;
  listLayoutClass: string;
  listItemTextClass: string;
  onSetFilter: <K extends keyof NetworkFilters>(key: K, value: NetworkFilters[K]) => void;
  onToggleFilter: (key: keyof NetworkFilters) => void;
}

export const ThreatFilters: React.FC<ThreatFiltersProps> = ({
  filters,
  enabled,
  isCompact,
  controlClass,
  listLayoutClass,
  listItemTextClass,
  onSetFilter,
  onToggleFilter,
}) => {
  return (
    <FilterSection title="Threat Level" compact={isCompact}>
      <FilterInput
        label="Threat Score Min"
        enabled={enabled.threatScoreMin || false}
        onToggle={() => onToggleFilter('threatScoreMin')}
        compact={isCompact}
      >
        <input
          type="number"
          value={filters.threatScoreMin ?? ''}
          onChange={(e) => onSetFilter('threatScoreMin', parseFloat(e.target.value))}
          placeholder="0"
          step="1"
          min="0"
          max="100"
          className={controlClass}
        />
      </FilterInput>

      <FilterInput
        label="Threat Score Max"
        enabled={enabled.threatScoreMax || false}
        onToggle={() => onToggleFilter('threatScoreMax')}
        compact={isCompact}
      >
        <input
          type="number"
          value={filters.threatScoreMax ?? ''}
          onChange={(e) => onSetFilter('threatScoreMax', parseFloat(e.target.value))}
          placeholder="100"
          step="1"
          min="0"
          max="100"
          className={controlClass}
        />
      </FilterInput>

      <FilterInput
        label="Threat Level (Computed)"
        enabled={enabled.threatCategories || false}
        onToggle={() => onToggleFilter('threatCategories')}
        compact={isCompact}
      >
        <div className="space-y-2">
          <p className="text-[11px] text-slate-400">
            Uses computed final threat level (CRITICAL/HIGH/MED/LOW/NONE), not manual tags.
          </p>
          <div className={listLayoutClass}>
            {(['critical', 'high', 'medium', 'low', 'none'] as ThreatCategory[]).map((cat) => (
              <label key={cat} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.threatCategories?.includes(cat) || false}
                  onChange={(e) => {
                    const current = filters.threatCategories || [];
                    const updated = e.target.checked
                      ? [...current, cat]
                      : current.filter((c: string) => c !== cat);
                    onSetFilter('threatCategories', updated);
                  }}
                  className="filter-panel__checkbox rounded border-slate-600 bg-slate-800 text-blue-500"
                />
                <span className={`${listItemTextClass} text-slate-300 capitalize`}>{cat}</span>
              </label>
            ))}
          </div>
        </div>
      </FilterInput>

      <FilterInput
        label="Stationary Confidence Min"
        enabled={enabled.stationaryConfidenceMin || false}
        onToggle={() => onToggleFilter('stationaryConfidenceMin')}
        compact={isCompact}
      >
        <input
          type="number"
          value={filters.stationaryConfidenceMin ?? ''}
          onChange={(e) => onSetFilter('stationaryConfidenceMin', parseFloat(e.target.value))}
          placeholder="0.0"
          step="0.1"
          min="0"
          max="1"
          className={controlClass}
        />
      </FilterInput>

      <FilterInput
        label="Stationary Confidence Max"
        enabled={enabled.stationaryConfidenceMax || false}
        onToggle={() => onToggleFilter('stationaryConfidenceMax')}
        compact={isCompact}
      >
        <input
          type="number"
          value={filters.stationaryConfidenceMax ?? ''}
          onChange={(e) => onSetFilter('stationaryConfidenceMax', parseFloat(e.target.value))}
          placeholder="1.0"
          step="0.1"
          min="0"
          max="1"
          className={controlClass}
        />
      </FilterInput>

      <FilterInput
        label="Rule-Based Score Range"
        enabled={enabled.ruleBasedScoreMin || enabled.ruleBasedScoreMax}
        onToggle={() => {
          onToggleFilter('ruleBasedScoreMin');
          onToggleFilter('ruleBasedScoreMax');
        }}
        compact={isCompact}
      >
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={filters.ruleBasedScoreMin ?? ''}
            onChange={(e) => onSetFilter('ruleBasedScoreMin', parseFloat(e.target.value))}
            placeholder="Min (0)"
            className={controlClass}
          />
          <span className="text-slate-500">to</span>
          <input
            type="number"
            value={filters.ruleBasedScoreMax ?? ''}
            onChange={(e) => onSetFilter('ruleBasedScoreMax', parseFloat(e.target.value))}
            placeholder="Max (100)"
            className={controlClass}
          />
        </div>
      </FilterInput>

      <FilterInput
        label="ML Threat Score Range"
        enabled={enabled.mlThreatScoreMin || enabled.mlThreatScoreMax}
        onToggle={() => {
          onToggleFilter('mlThreatScoreMin');
          onToggleFilter('mlThreatScoreMax');
        }}
        compact={isCompact}
      >
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={filters.mlThreatScoreMin ?? ''}
            onChange={(e) => onSetFilter('mlThreatScoreMin', parseFloat(e.target.value))}
            placeholder="Min (0)"
            className={controlClass}
          />
          <span className="text-slate-500">to</span>
          <input
            type="number"
            value={filters.mlThreatScoreMax ?? ''}
            onChange={(e) => onSetFilter('mlThreatScoreMax', parseFloat(e.target.value))}
            placeholder="Max (100)"
            className={controlClass}
          />
        </div>
      </FilterInput>

      <FilterInput
        label="ML Evidence Weight Range"
        enabled={enabled.mlWeightMin || enabled.mlWeightMax}
        onToggle={() => {
          onToggleFilter('mlWeightMin');
          onToggleFilter('mlWeightMax');
        }}
        compact={isCompact}
      >
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={filters.mlWeightMin ?? ''}
            onChange={(e) => onSetFilter('mlWeightMin', parseFloat(e.target.value))}
            placeholder="Min (0)"
            className={controlClass}
          />
          <span className="text-slate-500">to</span>
          <input
            type="number"
            value={filters.mlWeightMax ?? ''}
            onChange={(e) => onSetFilter('mlWeightMax', parseFloat(e.target.value))}
            placeholder="Max"
            className={controlClass}
          />
        </div>
      </FilterInput>

      <FilterInput
        label="ML Model Boost Range"
        enabled={enabled.mlBoostMin || enabled.mlBoostMax}
        onToggle={() => {
          onToggleFilter('mlBoostMin');
          onToggleFilter('mlBoostMax');
        }}
        compact={isCompact}
      >
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={filters.mlBoostMin ?? ''}
            onChange={(e) => onSetFilter('mlBoostMin', parseFloat(e.target.value))}
            placeholder="Min"
            className={controlClass}
          />
          <span className="text-slate-500">to</span>
          <input
            type="number"
            value={filters.mlBoostMax ?? ''}
            onChange={(e) => onSetFilter('mlBoostMax', parseFloat(e.target.value))}
            placeholder="Max"
            className={controlClass}
          />
        </div>
      </FilterInput>

      <FilterInput
        label="ML Model Version"
        enabled={enabled.modelVersion || false}
        onToggle={() => onToggleFilter('modelVersion')}
        compact={isCompact}
      >
        <input
          type="text"
          value={(filters.modelVersion ?? []).join(', ')}
          onChange={(e) =>
            onSetFilter(
              'modelVersion',
              e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
          placeholder="e.g. 1.0.0, legacy..."
          className={controlClass}
        />
        <p className="mt-1 text-[10px] text-slate-500">Comma-separated versions.</p>
      </FilterInput>
    </FilterSection>
  );
};

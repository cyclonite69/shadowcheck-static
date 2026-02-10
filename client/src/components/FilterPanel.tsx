/**
 * Universal Filter Panel Component
 * Collapsible, categorized filter interface
 */

import React, { useState } from 'react';
import { useFilterStore } from '../stores/filterStore';
import {
  AuthMethod,
  EncryptionType,
  FrequencyBand,
  InsecureFlag,
  RadioType,
  SecurityFlag,
  TemporalScope,
  ThreatCategory,
} from '../types/filters';
import { FilterSection, FilterInput } from './filter';
import { FilterPanelHeader } from './filters/FilterPanelHeader';
import { IdentityFilters, RadioFilters } from './filters/sections';

type FilterPanelDensity = 'normal' | 'compact';

interface FilterPanelProps {
  density?: FilterPanelDensity;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ density = 'normal' }) => {
  const {
    getCurrentFilters,
    getCurrentEnabled,
    setFilter,
    toggleFilter,
    enableFilter,
    clearFilters,
    resetFilters,
    savePreset,
    loadPreset,
    deletePreset,
    presets,
  } = useFilterStore();

  const filters = getCurrentFilters();
  const enabled = getCurrentEnabled();
  const activeFilterCount = Object.values(enabled || {}).filter(Boolean).length;
  const [presetName, setPresetName] = useState('');

  const isCompact = density === 'compact';
  const listLayoutClass = isCompact ? 'grid grid-cols-2 gap-2' : 'space-y-2';
  const listItemTextClass = isCompact ? 'text-[11px]' : 'text-xs';
  const controlBase =
    'filter-panel__control w-full bg-slate-800 border border-slate-600 rounded text-slate-200 min-w-0';
  const controlSize = isCompact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm';
  const controlClass = `${controlBase} ${controlSize}`;

  const panelWidthClass = isCompact ? 'w-full sm:w-72' : 'w-full sm:w-80';

  return (
    <div
      className={`filter-panel w-[420px] bg-slate-950 border border-slate-600 rounded-xl text-slate-200 flex flex-col h-full flex-shrink-0 overflow-visible ${
        isCompact ? 'filter-panel--compact' : ''
      }`}
    >
      {/* Header */}
      <FilterPanelHeader
        activeFilterCount={activeFilterCount}
        isCompact={isCompact}
        onClearAll={clearFilters}
        onReset={resetFilters}
      />

      {/* Filter Sections */}
      <div className="flex-1 overflow-y-auto overflow-x-visible">
        {/* Identity Filters */}
        <IdentityFilters
          filters={filters}
          enabled={enabled}
          isCompact={isCompact}
          controlClass={controlClass}
          onSetFilter={setFilter}
          onToggleFilter={toggleFilter}
        />

        {/* Radio / Physical Layer */}
        <RadioFilters
          filters={filters}
          enabled={enabled}
          isCompact={isCompact}
          controlClass={controlClass}
          listLayoutClass={listLayoutClass}
          listItemTextClass={listItemTextClass}
          onSetFilter={setFilter}
          onToggleFilter={toggleFilter}
        />

        {/* Security */}
        <FilterSection title="Security" compact={isCompact}>
          <FilterInput
            label="Encryption Types"
            enabled={enabled.encryptionTypes || false}
            onToggle={() => toggleFilter('encryptionTypes')}
            compact={isCompact}
          >
            <div className={listLayoutClass}>
              {(['OPEN', 'WEP', 'WPA', 'WPA2', 'WPA3'] as EncryptionType[]).map((type) => (
                <label key={type} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.encryptionTypes?.includes(type) || false}
                    onChange={(e) => {
                      const current = filters.encryptionTypes || [];
                      const updated = e.target.checked
                        ? [...current, type]
                        : current.filter((t) => t !== type);
                      console.log(
                        `🔧 Encryption filter changed: ${type}, checked: ${e.target.checked}, updated:`,
                        updated
                      );
                      setFilter('encryptionTypes', updated);
                      // Force enable the filter if we're adding a value
                      if (e.target.checked && updated.length > 0) {
                        enableFilter('encryptionTypes', true);
                      }
                      // Disable if no values selected
                      if (!e.target.checked && updated.length === 0) {
                        enableFilter('encryptionTypes', false);
                      }
                    }}
                    className="filter-panel__checkbox rounded border-slate-600 bg-slate-800 text-blue-500"
                  />
                  <span className={`${listItemTextClass} text-slate-300`}>{type}</span>
                </label>
              ))}
            </div>
          </FilterInput>

          <FilterInput
            label="Auth Methods"
            enabled={enabled.authMethods || false}
            onToggle={() => toggleFilter('authMethods')}
            compact={isCompact}
          >
            <div className={listLayoutClass}>
              {(['PSK', 'Enterprise', 'SAE', 'OWE', 'None'] as AuthMethod[]).map((method) => (
                <label key={method} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.authMethods?.includes(method) || false}
                    onChange={(e) => {
                      const current = filters.authMethods || [];
                      const updated = e.target.checked
                        ? [...current, method]
                        : current.filter((m) => m !== method);
                      setFilter('authMethods', updated);
                    }}
                    className="filter-panel__checkbox rounded border-slate-600 bg-slate-800 text-blue-500"
                  />
                  <span className={`${listItemTextClass} text-slate-300`}>{method}</span>
                </label>
              ))}
            </div>
          </FilterInput>

          <FilterInput
            label="Insecure Flags"
            enabled={enabled.insecureFlags || false}
            onToggle={() => toggleFilter('insecureFlags')}
            compact={isCompact}
          >
            <div className={listLayoutClass}>
              {(['open', 'wep', 'wps', 'deprecated'] as InsecureFlag[]).map((flag) => (
                <label key={flag} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.insecureFlags?.includes(flag) || false}
                    onChange={(e) => {
                      const current = filters.insecureFlags || [];
                      const updated = e.target.checked
                        ? [...current, flag]
                        : current.filter((f) => f !== flag);
                      setFilter('insecureFlags', updated);
                    }}
                    className="filter-panel__checkbox rounded border-slate-600 bg-slate-800 text-blue-500"
                  />
                  <span className={`${listItemTextClass} text-slate-300 capitalize`}>{flag}</span>
                </label>
              ))}
            </div>
          </FilterInput>

          <FilterInput
            label="Security Inference Flags"
            enabled={enabled.securityFlags || false}
            onToggle={() => toggleFilter('securityFlags')}
            compact={isCompact}
          >
            <div className={listLayoutClass}>
              {(
                ['insecure', 'deprecated', 'enterprise', 'personal', 'unknown'] as SecurityFlag[]
              ).map((flag) => (
                <label key={flag} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.securityFlags?.includes(flag) || false}
                    onChange={(e) => {
                      const current = filters.securityFlags || [];
                      const updated = e.target.checked
                        ? [...current, flag]
                        : current.filter((f) => f !== flag);
                      setFilter('securityFlags', updated);
                    }}
                    className="filter-panel__checkbox rounded border-slate-600 bg-slate-800 text-blue-500"
                  />
                  <span className={`${listItemTextClass} text-slate-300 capitalize`}>{flag}</span>
                </label>
              ))}
            </div>
          </FilterInput>
        </FilterSection>

        {/* Temporal */}
        <FilterSection title="Time Range" compact={isCompact}>
          <FilterInput
            label="Timeframe"
            enabled={enabled.timeframe || false}
            onToggle={() => {
              const next = !enabled.timeframe;
              enableFilter('timeframe', next);
              enableFilter('temporalScope', next);
            }}
            compact={isCompact}
          >
            <div className="space-y-3">
              <div>
                <label htmlFor="temporal-scope-select" className="text-xs text-slate-400">
                  Temporal Scope
                </label>
                <select
                  id="temporal-scope-select"
                  value={filters.temporalScope || TemporalScope.OBSERVATION_TIME}
                  onChange={(e) => setFilter('temporalScope', e.target.value as TemporalScope)}
                  className={`${controlClass} mt-1`}
                >
                  <option value={TemporalScope.OBSERVATION_TIME}>Observation Time</option>
                  <option value={TemporalScope.NETWORK_LIFETIME}>Network Lifetime</option>
                  <option value={TemporalScope.THREAT_WINDOW}>Threat Window</option>
                </select>
              </div>

              <div>
                <label htmlFor="timeframe-mode-select" className="text-xs text-slate-400">
                  Mode
                </label>
                <select
                  id="timeframe-mode-select"
                  value={filters.timeframe?.type || 'relative'}
                  onChange={(e) =>
                    setFilter('timeframe', {
                      ...(filters.timeframe || {}),
                      type: e.target.value as 'relative' | 'absolute',
                    })
                  }
                  className={`${controlClass} mt-1`}
                >
                  <option value="relative">Relative</option>
                  <option value="absolute">Absolute</option>
                </select>
              </div>

              {filters.timeframe?.type !== 'absolute' ? (
                <div>
                  <label htmlFor="relative-window-select" className="text-xs text-slate-400">
                    Relative Window
                  </label>
                  <select
                    id="relative-window-select"
                    value={filters.timeframe?.relativeWindow || '30d'}
                    onChange={(e) =>
                      setFilter('timeframe', {
                        type: 'relative',
                        relativeWindow: e.target.value as any,
                      })
                    }
                    className={`${controlClass} mt-1`}
                  >
                    <option value="24h">Last 24 hours</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                    <option value="6mo">Last 6 months</option>
                    <option value="9mo">Last 9 months</option>
                    <option value="1y">Last 1 year</option>
                    <option value="18mo">Last 18 months</option>
                    <option value="2y">Last 2 years</option>
                    <option value="all">All time</option>
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label htmlFor="timeframe-start-input" className="text-xs text-slate-400">
                      Start (ISO)
                    </label>
                    <input
                      id="timeframe-start-input"
                      type="datetime-local"
                      value={filters.timeframe?.startTimestamp || ''}
                      onChange={(e) =>
                        setFilter('timeframe', {
                          type: 'absolute',
                          startTimestamp: e.target.value,
                          endTimestamp: filters.timeframe?.endTimestamp,
                        })
                      }
                      className={`${controlClass} mt-1`}
                    />
                  </div>
                  <div>
                    <label htmlFor="timeframe-end-input" className="text-xs text-slate-400">
                      End (ISO)
                    </label>
                    <input
                      id="timeframe-end-input"
                      type="datetime-local"
                      value={filters.timeframe?.endTimestamp || ''}
                      onChange={(e) =>
                        setFilter('timeframe', {
                          type: 'absolute',
                          startTimestamp: filters.timeframe?.startTimestamp,
                          endTimestamp: e.target.value,
                        })
                      }
                      className={`${controlClass} mt-1`}
                    />
                  </div>
                </div>
              )}
            </div>
          </FilterInput>
        </FilterSection>

        {/* Threat & Heuristics */}
        <FilterSection title="Threat Analysis" compact={isCompact}>
          <FilterInput
            label="Threat Score Min"
            enabled={enabled.threatScoreMin || false}
            onToggle={() => toggleFilter('threatScoreMin')}
            compact={isCompact}
          >
            <input
              type="number"
              min="0"
              max="100"
              value={filters.threatScoreMin || ''}
              onChange={(e) => setFilter('threatScoreMin', parseInt(e.target.value, 10))}
              placeholder="Min"
              className={controlClass}
            />
          </FilterInput>

          <FilterInput
            label="Threat Score Max"
            enabled={enabled.threatScoreMax || false}
            onToggle={() => toggleFilter('threatScoreMax')}
            compact={isCompact}
          >
            <input
              type="number"
              min="0"
              max="100"
              value={filters.threatScoreMax || ''}
              onChange={(e) => setFilter('threatScoreMax', parseInt(e.target.value, 10))}
              placeholder="Max"
              className={controlClass}
            />
          </FilterInput>

          <FilterInput
            label="Threat Categories"
            enabled={enabled.threatCategories || false}
            onToggle={() => toggleFilter('threatCategories')}
            compact={isCompact}
          >
            <div className={listLayoutClass}>
              {(['critical', 'high', 'medium', 'low'] as ThreatCategory[]).map((category) => (
                <label key={category} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.threatCategories?.includes(category) || false}
                    onChange={(e) => {
                      const current = filters.threatCategories || [];
                      const updated = e.target.checked
                        ? [...current, category]
                        : current.filter((c) => c !== category);
                      setFilter('threatCategories', updated);
                    }}
                    className="filter-panel__checkbox rounded border-slate-600 bg-slate-800 text-blue-500"
                  />
                  <span
                    className={`${listItemTextClass} capitalize ${
                      category === 'critical'
                        ? 'text-red-400'
                        : category === 'high'
                          ? 'text-orange-400'
                          : category === 'medium'
                            ? 'text-yellow-400'
                            : 'text-green-400'
                    }`}
                  >
                    {category}
                  </span>
                </label>
              ))}
            </div>
          </FilterInput>

          <FilterInput
            label="Stationary Confidence Min"
            enabled={enabled.stationaryConfidenceMin || false}
            onToggle={() => toggleFilter('stationaryConfidenceMin')}
            compact={isCompact}
          >
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={filters.stationaryConfidenceMin ?? ''}
              onChange={(e) => setFilter('stationaryConfidenceMin', parseFloat(e.target.value))}
              placeholder="0.0 - 1.0"
              className={controlClass}
            />
          </FilterInput>

          <FilterInput
            label="Stationary Confidence Max"
            enabled={enabled.stationaryConfidenceMax || false}
            onToggle={() => toggleFilter('stationaryConfidenceMax')}
            compact={isCompact}
          >
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={filters.stationaryConfidenceMax ?? ''}
              onChange={(e) => setFilter('stationaryConfidenceMax', parseFloat(e.target.value))}
              placeholder="0.0 - 1.0"
              className={controlClass}
            />
            <p className="mt-1 text-xs text-slate-500">
              Derived from spatial variance + temporal spread + observation density.
            </p>
          </FilterInput>
        </FilterSection>

        {/* Observation Quality */}
        <FilterSection title="Data Quality" compact={isCompact}>
          <p className="text-xs text-slate-500">
            Credibility heuristics only. Disabled by default.
          </p>
          <FilterInput
            label="Observation Count Min"
            enabled={enabled.observationCountMin || false}
            onToggle={() => toggleFilter('observationCountMin')}
            compact={isCompact}
          >
            <input
              type="number"
              min="1"
              value={filters.observationCountMin || ''}
              onChange={(e) => setFilter('observationCountMin', parseInt(e.target.value, 10))}
              placeholder="Min obs"
              className={controlClass}
            />
          </FilterInput>

          <FilterInput
            label="Observation Count Max"
            enabled={enabled.observationCountMax || false}
            onToggle={() => toggleFilter('observationCountMax')}
            compact={isCompact}
          >
            <input
              type="number"
              min="1"
              value={filters.observationCountMax || ''}
              onChange={(e) => setFilter('observationCountMax', parseInt(e.target.value, 10))}
              placeholder="Max obs"
              className={controlClass}
            />
          </FilterInput>

          <FilterInput
            label="GPS Accuracy Limit"
            enabled={enabled.gpsAccuracyMax || false}
            onToggle={() => toggleFilter('gpsAccuracyMax')}
            compact={isCompact}
          >
            <input
              type="number"
              min="1"
              value={filters.gpsAccuracyMax || 100}
              onChange={(e) => setFilter('gpsAccuracyMax', parseInt(e.target.value))}
              placeholder="Max meters"
              className={controlClass}
            />
          </FilterInput>

          <FilterInput
            label="Quality Filter"
            enabled={enabled.qualityFilter || false}
            onToggle={() => toggleFilter('qualityFilter')}
            compact={isCompact}
          >
            <select
              aria-label="Quality filter options"
              value={filters.qualityFilter || 'none'}
              onChange={(e) => setFilter('qualityFilter', e.target.value)}
              className={controlClass}
            >
              <option value="none">No Filter</option>
              <option value="temporal">Exclude Temporal Clusters</option>
              <option value="extreme">Exclude Extreme Signals</option>
              <option value="duplicate">Exclude Duplicate Coords</option>
              <option value="all">Exclude All Anomalies</option>
            </select>
          </FilterInput>

          <FilterInput
            label="Exclude Invalid Coordinates"
            enabled={enabled.excludeInvalidCoords || false}
            onToggle={() => toggleFilter('excludeInvalidCoords')}
            compact={isCompact}
          >
            <p className="text-xs text-slate-400">
              Removes observations with NULL or out-of-range lat/lon.
            </p>
          </FilterInput>
        </FilterSection>

        {/* Spatial / Proximity */}
        <FilterSection title="Spatial & Proximity" compact={isCompact}>
          <FilterInput
            label="Distance From Home Min (meters)"
            enabled={enabled.distanceFromHomeMin || false}
            onToggle={() => toggleFilter('distanceFromHomeMin')}
            compact={isCompact}
          >
            <input
              type="number"
              min="0"
              value={filters.distanceFromHomeMin ?? ''}
              onChange={(e) => setFilter('distanceFromHomeMin', parseInt(e.target.value, 10))}
              placeholder="Min meters"
              className={controlClass}
            />
          </FilterInput>

          <FilterInput
            label="Distance From Home Max (meters)"
            enabled={enabled.distanceFromHomeMax || false}
            onToggle={() => toggleFilter('distanceFromHomeMax')}
            compact={isCompact}
          >
            <input
              type="number"
              min="0"
              value={filters.distanceFromHomeMax ?? ''}
              onChange={(e) => setFilter('distanceFromHomeMax', parseInt(e.target.value, 10))}
              placeholder="Max meters"
              className={controlClass}
            />
          </FilterInput>

          <FilterInput
            label="Bounding Box"
            enabled={enabled.boundingBox || false}
            onToggle={() => toggleFilter('boundingBox')}
            compact={isCompact}
          >
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={filters.boundingBox?.north ?? ''}
                onChange={(e) =>
                  setFilter('boundingBox', {
                    ...(filters.boundingBox || {}),
                    north: parseFloat(e.target.value),
                  })
                }
                placeholder="North"
                className="filter-panel__control px-2 py-1 bg-slate-800 border border-slate-600 rounded text-slate-200 text-sm box-border"
              />
              <input
                type="number"
                value={filters.boundingBox?.south ?? ''}
                onChange={(e) =>
                  setFilter('boundingBox', {
                    ...(filters.boundingBox || {}),
                    south: parseFloat(e.target.value),
                  })
                }
                placeholder="South"
                className="filter-panel__control px-2 py-1 bg-slate-800 border border-slate-600 rounded text-slate-200 text-sm box-border"
              />
              <input
                type="number"
                value={filters.boundingBox?.east ?? ''}
                onChange={(e) =>
                  setFilter('boundingBox', {
                    ...(filters.boundingBox || {}),
                    east: parseFloat(e.target.value),
                  })
                }
                placeholder="East"
                className="filter-panel__control px-2 py-1 bg-slate-800 border border-slate-600 rounded text-slate-200 text-sm box-border"
              />
              <input
                type="number"
                value={filters.boundingBox?.west ?? ''}
                onChange={(e) =>
                  setFilter('boundingBox', {
                    ...(filters.boundingBox || {}),
                    west: parseFloat(e.target.value),
                  })
                }
                placeholder="West"
                className="filter-panel__control px-2 py-1 bg-slate-800 border border-slate-600 rounded text-slate-200 text-sm box-border"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Can be populated from map bounds when enabled.
            </p>
          </FilterInput>

          <FilterInput
            label="Radius Filter (meters)"
            enabled={enabled.radiusFilter || false}
            onToggle={() => toggleFilter('radiusFilter')}
            compact={isCompact}
          >
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={filters.radiusFilter?.latitude ?? ''}
                onChange={(e) =>
                  setFilter('radiusFilter', {
                    ...(filters.radiusFilter || {}),
                    latitude: parseFloat(e.target.value),
                  })
                }
                placeholder="Latitude"
                className="filter-panel__control px-2 py-1 bg-slate-800 border border-slate-600 rounded text-slate-200 text-sm box-border"
              />
              <input
                type="number"
                value={filters.radiusFilter?.longitude ?? ''}
                onChange={(e) =>
                  setFilter('radiusFilter', {
                    ...(filters.radiusFilter || {}),
                    longitude: parseFloat(e.target.value),
                  })
                }
                placeholder="Longitude"
                className="filter-panel__control px-2 py-1 bg-slate-800 border border-slate-600 rounded text-slate-200 text-sm box-border"
              />
              <input
                type="number"
                value={filters.radiusFilter?.radiusMeters ?? ''}
                onChange={(e) =>
                  setFilter('radiusFilter', {
                    ...(filters.radiusFilter || {}),
                    radiusMeters: parseFloat(e.target.value),
                  })
                }
                placeholder="Radius (m)"
                className="filter-panel__control col-span-2 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-slate-200 text-sm box-border"
              />
            </div>
          </FilterInput>
        </FilterSection>

        {/* Presets */}
        <FilterSection title="Presets" compact={isCompact}>
          <div className="space-y-2">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name"
              className={controlClass}
            />
            <button
              onClick={() => {
                const name = presetName.trim();
                if (!name) return;
                savePreset(name);
                setPresetName('');
              }}
              className="w-full px-3 py-2 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
            >
              Save Preset
            </button>
          </div>

          {Object.keys(presets).length > 0 && (
            <div className="space-y-2">
              {Object.entries(presets).map(([name]) => (
                <div
                  key={name}
                  className="flex items-center justify-between gap-2 rounded border border-slate-700 px-2 py-1"
                >
                  <div className="text-xs text-slate-300">{name}</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadPreset(name)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deletePreset(name)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-500">
            Presets store explicit filters + enabled flags as JSON.
          </p>
        </FilterSection>
      </div>
    </div>
  );
};

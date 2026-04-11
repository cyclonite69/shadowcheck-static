/**
 * Geocoding & Address Filters Section
 */

import React from 'react';
import { FilterSection, FilterInput } from '../../filter';
import { NetworkFilters } from '../../../types/filters';

interface GeocodingFiltersProps {
  filters: NetworkFilters;
  enabled: Record<keyof NetworkFilters, boolean>;
  isCompact: boolean;
  controlClass: string;
  onSetFilter: <K extends keyof NetworkFilters>(key: K, value: NetworkFilters[K]) => void;
  onToggleFilter: (key: keyof NetworkFilters) => void;
}

export const GeocodingFilters: React.FC<GeocodingFiltersProps> = ({
  filters,
  enabled,
  isCompact,
  controlClass,
  onSetFilter,
  onToggleFilter,
}) => {
  return (
    <FilterSection title="Geocoding & Address" compact={isCompact}>
      <FilterInput
        label="Address"
        enabled={enabled.geocodedAddress || false}
        onToggle={() => onToggleFilter('geocodedAddress')}
        compact={isCompact}
      >
        <input
          type="text"
          value={filters.geocodedAddress || ''}
          onChange={(e) => onSetFilter('geocodedAddress', e.target.value)}
          placeholder="Search address..."
          className={controlClass}
        />
      </FilterInput>

      <FilterInput
        label="City"
        enabled={enabled.geocodedCity || false}
        onToggle={() => onToggleFilter('geocodedCity')}
        compact={isCompact}
      >
        <input
          type="text"
          value={filters.geocodedCity || ''}
          onChange={(e) => onSetFilter('geocodedCity', e.target.value)}
          placeholder="City name (starts with)..."
          className={controlClass}
        />
      </FilterInput>

      <FilterInput
        label="State / Region"
        enabled={enabled.geocodedState || false}
        onToggle={() => onToggleFilter('geocodedState')}
        compact={isCompact}
      >
        <input
          type="text"
          value={filters.geocodedState || ''}
          onChange={(e) => onSetFilter('geocodedState', e.target.value)}
          placeholder="e.g. MI, CA, NY..."
          className={controlClass}
        />
      </FilterInput>

      <FilterInput
        label="Postal Code"
        enabled={enabled.geocodedPostalCode || false}
        onToggle={() => onToggleFilter('geocodedPostalCode')}
        compact={isCompact}
      >
        <input
          type="text"
          value={filters.geocodedPostalCode || ''}
          onChange={(e) => onSetFilter('geocodedPostalCode', e.target.value)}
          placeholder="Zip or postal code..."
          className={controlClass}
        />
      </FilterInput>

      <FilterInput
        label="Country"
        enabled={enabled.geocodedCountry || false}
        onToggle={() => onToggleFilter('geocodedCountry')}
        compact={isCompact}
      >
        <input
          type="text"
          value={filters.geocodedCountry || ''}
          onChange={(e) => onSetFilter('geocodedCountry', e.target.value)}
          placeholder="e.g. US, GB, CA..."
          className={controlClass}
        />
      </FilterInput>

      <FilterInput
        label="POI Name"
        enabled={enabled.geocodedPoiName || false}
        onToggle={() => onToggleFilter('geocodedPoiName')}
        compact={isCompact}
      >
        <input
          type="text"
          value={filters.geocodedPoiName || ''}
          onChange={(e) => onSetFilter('geocodedPoiName', e.target.value)}
          placeholder="Point of interest name..."
          className={controlClass}
        />
      </FilterInput>

      <FilterInput
        label="POI Category"
        enabled={enabled.geocodedPoiCategory || false}
        onToggle={() => onToggleFilter('geocodedPoiCategory')}
        compact={isCompact}
      >
        <input
          type="text"
          value={filters.geocodedPoiCategory || ''}
          onChange={(e) => onSetFilter('geocodedPoiCategory', e.target.value)}
          placeholder="e.g. cafe, restaurant..."
          className={controlClass}
        />
      </FilterInput>

      <FilterInput
        label="Feature Type"
        enabled={enabled.geocodedFeatureType || false}
        onToggle={() => onToggleFilter('geocodedFeatureType')}
        compact={isCompact}
      >
        <input
          type="text"
          value={filters.geocodedFeatureType || ''}
          onChange={(e) => onSetFilter('geocodedFeatureType', e.target.value)}
          placeholder="e.g. address, place, poi..."
          className={controlClass}
        />
      </FilterInput>

      <FilterInput
        label="Geocoding Provider"
        enabled={enabled.geocodedProvider || false}
        onToggle={() => onToggleFilter('geocodedProvider')}
        compact={isCompact}
      >
        <input
          type="text"
          value={filters.geocodedProvider || ''}
          onChange={(e) => onSetFilter('geocodedProvider', e.target.value)}
          placeholder="e.g. mapbox, google..."
          className={controlClass}
        />
      </FilterInput>

      <FilterInput
        label="Confidence Min"
        enabled={enabled.geocodedConfidenceMin || false}
        onToggle={() => onToggleFilter('geocodedConfidenceMin')}
        compact={isCompact}
      >
        <input
          type="number"
          value={filters.geocodedConfidenceMin ?? ''}
          onChange={(e) => onSetFilter('geocodedConfidenceMin', parseFloat(e.target.value))}
          placeholder="0.0"
          step="0.1"
          min="0"
          max="1"
          className={controlClass}
        />
      </FilterInput>

      <FilterInput
        label="Confidence Max"
        enabled={enabled.geocodedConfidenceMax || false}
        onToggle={() => onToggleFilter('geocodedConfidenceMax')}
        compact={isCompact}
      >
        <input
          type="number"
          value={filters.geocodedConfidenceMax ?? ''}
          onChange={(e) => onSetFilter('geocodedConfidenceMax', parseFloat(e.target.value))}
          placeholder="1.0"
          step="0.1"
          min="0"
          max="1"
          className={controlClass}
        />
      </FilterInput>
    </FilterSection>
  );
};

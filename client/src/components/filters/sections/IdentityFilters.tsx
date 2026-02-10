/**
 * Identity Filters Section
 * SSID, BSSID, Manufacturer, Network ID filters
 */

import React from 'react';
import { FilterSection, FilterInput } from '../../filter';

interface IdentityFiltersProps {
  filters: {
    ssid?: string;
    bssid?: string;
    manufacturer?: string;
    networkId?: string;
  };
  enabled: {
    ssid?: boolean;
    bssid?: boolean;
    manufacturer?: boolean;
    networkId?: boolean;
  };
  isCompact: boolean;
  controlClass: string;
  onSetFilter: (key: string, value: any) => void;
  onToggleFilter: (key: string) => void;
}

export const IdentityFilters: React.FC<IdentityFiltersProps> = ({
  filters,
  enabled,
  isCompact,
  controlClass,
  onSetFilter,
  onToggleFilter,
}) => {
  return (
    <FilterSection title="Identity" compact={isCompact}>
      <FilterInput
        label="SSID"
        enabled={enabled.ssid || false}
        onToggle={() => onToggleFilter('ssid')}
        compact={isCompact}
      >
        <input
          type="text"
          value={filters.ssid || ''}
          onChange={(e) => onSetFilter('ssid', e.target.value)}
          placeholder="Network name..."
          className={`${controlClass} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
        />
      </FilterInput>

      <FilterInput
        label="BSSID (exact or prefix)"
        enabled={enabled.bssid || false}
        onToggle={() => onToggleFilter('bssid')}
        compact={isCompact}
      >
        <input
          type="text"
          value={filters.bssid || ''}
          onChange={(e) => onSetFilter('bssid', e.target.value)}
          placeholder="AA:BB:CC:DD:EE:FF or AA:BB:CC"
          className={`${controlClass} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
        />
        <p className="mt-1 text-xs text-slate-500">
          Full BSSID = exact match. Prefix = starts-with match.
        </p>
      </FilterInput>

      <FilterInput
        label="Manufacturer / OUI"
        enabled={enabled.manufacturer || false}
        onToggle={() => onToggleFilter('manufacturer')}
        compact={isCompact}
      >
        <input
          type="text"
          value={filters.manufacturer || ''}
          onChange={(e) => onSetFilter('manufacturer', e.target.value)}
          placeholder="Apple, Samsung, 001A2B..."
          className={`${controlClass} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
        />
      </FilterInput>

      <FilterInput
        label="Internal Network ID"
        enabled={enabled.networkId || false}
        onToggle={() => onToggleFilter('networkId')}
        compact={isCompact}
      >
        <input
          type="text"
          value={filters.networkId || ''}
          onChange={(e) => onSetFilter('networkId', e.target.value)}
          placeholder="unified_id..."
          className={`${controlClass} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
        />
      </FilterInput>
    </FilterSection>
  );
};

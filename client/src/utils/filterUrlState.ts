import type { NetworkFilters } from '../types/filters';

export interface FilterStatePayload {
  filters: NetworkFilters;
  enabled: Record<string, boolean>;
}

export function buildFilterStateParams(payload: FilterStatePayload): URLSearchParams {
  const params = new URLSearchParams();
  params.set('filters', JSON.stringify(payload.filters));
  params.set('enabled', JSON.stringify(payload.enabled));
  return params;
}

export function parseFilterStateParams(params: URLSearchParams): FilterStatePayload | null {
  const rawFilters = params.get('filters');
  const rawEnabled = params.get('enabled');

  if (!rawFilters || !rawEnabled || rawFilters === 'undefined' || rawEnabled === 'undefined') {
    return null;
  }

  try {
    const filters = JSON.parse(rawFilters) as NetworkFilters;
    const enabled = JSON.parse(rawEnabled) as Record<string, boolean>;
    return { filters, enabled };
  } catch {
    return null;
  }
}

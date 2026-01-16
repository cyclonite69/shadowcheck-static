/**
 * Hook for using adapted filters on a page
 * Automatically adapts canonical filters to page capabilities
 */

import { useMemo } from 'react';
import { useFilterStore } from '../stores/filterStore';
import { adaptFiltersToPage, PageFilterCapabilities } from '../utils/filterCapabilities';

/**
 * Use adapted filters for a specific page
 * Returns only the filters the page supports, plus metadata about ignored filters
 */
export function useAdaptedFilters(capabilities: PageFilterCapabilities) {
  // Use individual selectors to avoid re-renders when isLoading changes
  const filters = useFilterStore((state) => state.filters);
  const enabled = useFilterStore((state) => state.enabled);

  const adapted = useMemo(() => {
    return adaptFiltersToPage(filters, enabled, capabilities);
  }, [filters, enabled, capabilities]);

  return adapted;
}

/**
 * Get filter payload for API requests
 * Returns the standard { filters, enabled } shape with only supported filters
 */
export function useFilterPayload(capabilities: PageFilterCapabilities) {
  const adapted = useAdaptedFilters(capabilities);

  return useMemo(
    () => ({
      filters: adapted.filtersForPage,
      enabled: adapted.enabledForPage,
    }),
    [adapted]
  );
}

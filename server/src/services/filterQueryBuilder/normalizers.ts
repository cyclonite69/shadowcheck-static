/**
 * Filter Normalizers
 * Input normalization and coercion utilities for filter values.
 */

import { FILTER_KEYS, DEFAULT_ENABLED, type FilterKey } from './constants';
import type { Filters, EnabledFlags } from './types';

const normalizeEnabled = (enabled: unknown): EnabledFlags => {
  if (!enabled || typeof enabled !== 'object') {
    return { ...DEFAULT_ENABLED };
  }
  const normalized = { ...DEFAULT_ENABLED };
  const toBool = (value: unknown): boolean => {
    if (value === true || value === 'true' || value === 1 || value === '1') {
      return true;
    }
    if (
      value === false ||
      value === 'false' ||
      value === 0 ||
      value === '0' ||
      value === null ||
      value === undefined
    ) {
      return false;
    }
    return Boolean(value);
  };
  FILTER_KEYS.forEach((key: FilterKey) => {
    normalized[key] = toBool((enabled as Record<string, unknown>)[key]);
  });
  return normalized;
};

const normalizeFilters = (filters: unknown): Filters =>
  filters && typeof filters === 'object' ? (filters as Filters) : {};

const isOui = (value: string | null | undefined): boolean => /^[0-9A-F]{6}$/.test(value || '');

const coerceOui = (value: unknown): string =>
  String(value || '')
    .replace(/[^0-9A-Fa-f]/g, '')
    .toUpperCase();

export { normalizeEnabled, normalizeFilters, isOui, coerceOui };

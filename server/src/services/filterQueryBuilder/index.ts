/**
 * Filter Query Builder
 * Barrel export for backward compatibility.
 */

import { UniversalFilterQueryBuilder } from './universalFilterQueryBuilder';
import { validateFilterPayload } from './validators';
import { DEFAULT_ENABLED } from './constants';

export { UniversalFilterQueryBuilder, validateFilterPayload, DEFAULT_ENABLED };

// Re-export types for consumers
export type {
  Filters,
  EnabledFlags,
  AppliedFilter,
  IgnoredFilter,
  QueryResult,
  FilteredQueryResult,
  ValidationResult,
  BoundingBox,
  RadiusFilter,
  Timeframe,
  AnalyticsQueries,
} from './types';

export type { FilterKey } from './constants';

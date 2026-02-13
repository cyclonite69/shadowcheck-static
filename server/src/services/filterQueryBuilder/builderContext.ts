/**
 * Builder Context
 * Shared mutable state passed by reference to all extracted query builder functions.
 * This pattern allows splitting the monolithic class into focused modules while
 * preserving shared state mutation semantics.
 */

import type { Filters, EnabledFlags, AppliedFilter, IgnoredFilter } from './types';
import { validateFilterPayload } from './validators';

export interface BuilderContext {
  filters: Filters;
  enabled: EnabledFlags;
  params: unknown[];
  paramIndex: number;
  appliedFilters: AppliedFilter[];
  ignoredFilters: IgnoredFilter[];
  warnings: string[];
  obsJoins: Set<string>;
  requiresHome: boolean;
  addParam(value: unknown): string;
  addApplied(type: string, field: string, value: unknown): void;
  addIgnored(type: string, field: string, reason: string): void;
}

export function createBuilderContext(filters: unknown, enabled: unknown): BuilderContext {
  const { filters: normalized, enabled: flags } = validateFilterPayload(filters, enabled);

  const ctx: BuilderContext = {
    filters: normalized,
    enabled: flags,
    params: [],
    paramIndex: 1,
    appliedFilters: [],
    ignoredFilters: [],
    warnings: [],
    obsJoins: new Set(),
    requiresHome: false,

    addParam(value: unknown): string {
      ctx.params.push(value);
      const index = ctx.paramIndex;
      ctx.paramIndex += 1;
      return `$${index}`;
    },

    addApplied(type: string, field: string, value: unknown): void {
      ctx.appliedFilters.push({ type, field, value });
    },

    addIgnored(type: string, field: string, reason: string): void {
      ctx.ignoredFilters.push({ type, field, reason });
    },
  };

  return ctx;
}

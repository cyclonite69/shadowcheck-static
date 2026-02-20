/**
 * Dashboard API
 */

import { apiClient } from './client';

interface DashboardFilters {
  filters: Record<string, unknown>;
  enabled: Record<string, boolean>;
}

interface DashboardMetrics {
  networks: {
    total: number;
    wifi: number;
    ble: number;
    cellular: number;
    bluetooth?: number;
    lte?: number;
    gsm?: number;
    nr?: number;
  };
  observations: {
    total: number;
    wifi: number;
    ble: number;
    cellular: number;
    bluetooth?: number;
    lte?: number;
    gsm?: number;
    nr?: number;
  };
  filtersApplied?: number;
}

interface ThreatSeverityCounts {
  counts: {
    critical: Record<string, number>;
    high: Record<string, number>;
    medium: Record<string, number>;
    low: Record<string, number>;
  };
}

export const dashboardApi = {
  async getMetrics(filters: DashboardFilters, signal?: AbortSignal): Promise<DashboardMetrics> {
    return apiClient.get<DashboardMetrics>('/dashboard-metrics', {
      params: {
        filters: JSON.stringify(filters.filters),
        enabled: JSON.stringify(filters.enabled),
      },
      signal,
    });
  },

  async getThreatSeverityCounts(
    filters: DashboardFilters,
    signal?: AbortSignal
  ): Promise<ThreatSeverityCounts> {
    return apiClient.get<ThreatSeverityCounts>('/v2/threats/severity-counts', {
      params: {
        filters: JSON.stringify(filters.filters),
        enabled: JSON.stringify(filters.enabled),
      },
      signal,
    });
  },
};

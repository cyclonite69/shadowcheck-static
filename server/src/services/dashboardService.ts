const logger = require('../logging/logger');

// Type definitions for dashboard service

interface Filters {
  [key: string]: unknown;
}

interface EnabledFlags {
  [key: string]: boolean;
}

interface DashboardMetrics {
  totalNetworks: number;
  wifiCount: number;
  bleCount: number;
  bluetoothCount: number;
  lteCount: number;
  nrCount?: number;
  gsmCount?: number;
  enrichedCount?: number;
  threatCount?: number;
  totalObservations?: number;
  [key: string]: unknown;
}

interface DashboardMetricsWithTimestamp extends DashboardMetrics {
  lastUpdated: string;
}

interface ThreatenedNetwork {
  bssid: string;
  ssid: string | null;
  threatScore: number | null;
  threatLevel: string | null;
  type: string;
  signal: number | null;
  observations: number;
  lastSeen: string | Date | null;
}

interface ThreatSummary {
  bssid: string;
  ssid: string | null;
  threatScore: number | null;
  threatLevel: string | null;
  type: string;
  signal: number | null;
  observations: number;
  lastSeen: string | Date | null;
}

interface NetworkDistribution {
  wifi: number;
  ble: number;
  bluetooth: number;
  lte: number;
  total: number;
}

interface NetworkRepository {
  getDashboardMetrics(filters?: Filters, enabled?: EnabledFlags): Promise<DashboardMetrics>;
  getThreatenedNetworks(): Promise<ThreatenedNetwork[]>;
}

class DashboardService {
  private networkRepository: NetworkRepository;

  constructor(networkRepository: NetworkRepository) {
    this.networkRepository = networkRepository;
  }

  async getMetrics(
    filters: Filters = {},
    enabled: EnabledFlags = {}
  ): Promise<DashboardMetricsWithTimestamp> {
    try {
      const metrics = await this.networkRepository.getDashboardMetrics(filters, enabled);
      return {
        ...metrics,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      const err = error as Error;
      logger.error(`Error getting dashboard metrics: ${err.message}`, { error });
      throw error;
    }
  }

  async getThreats(): Promise<ThreatSummary[]> {
    try {
      const networks = await this.networkRepository.getThreatenedNetworks();

      return networks
        .sort((a, b) => (b.threatScore || 0) - (a.threatScore || 0))
        .slice(0, 100)
        .map((n) => ({
          bssid: n.bssid,
          ssid: n.ssid,
          threatScore: n.threatScore,
          threatLevel: n.threatLevel,
          type: n.type,
          signal: n.signal,
          observations: n.observations,
          lastSeen: n.lastSeen,
        }));
    } catch (error) {
      const err = error as Error;
      logger.error(`Error getting threats: ${err.message}`, { error });
      throw error;
    }
  }

  async getNetworkDistribution(): Promise<NetworkDistribution> {
    try {
      const metrics = await this.networkRepository.getDashboardMetrics();

      return {
        wifi: metrics.wifiCount,
        ble: metrics.bleCount,
        bluetooth: metrics.bluetoothCount,
        lte: metrics.lteCount,
        total: metrics.totalNetworks,
      };
    } catch (error) {
      const err = error as Error;
      logger.error(`Error getting network distribution: ${err.message}`, { error });
      throw error;
    }
  }
}

module.exports = DashboardService;

// Export types for consumers
export type {
  Filters,
  EnabledFlags,
  DashboardMetrics,
  DashboardMetricsWithTimestamp,
  ThreatenedNetwork,
  ThreatSummary,
  NetworkDistribution,
  NetworkRepository,
};

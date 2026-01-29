// ===== FILE: src/components/analytics/utils/dataTransformers.ts =====
// PURPOSE: Data transformation utilities for processing API responses into chart-ready format
// EXTRACTS: Data processing functions from lines 340-516 in original AnalyticsPage.tsx

import { NETWORK_TYPE_COLORS, SECURITY_TYPE_COLORS } from './chartConstants';

// Transform network types data for pie chart
export const transformNetworkTypesData = (rawData: any[]) => {
  if (!rawData || !Array.isArray(rawData)) return [];

  return rawData
    .map((item) => ({
      name: item.network_type,
      value: Number(item.count),
      color: NETWORK_TYPE_COLORS[item.network_type] || '#64748b',
    }))
    .filter((item) => !isNaN(item.value) && item.value > 0);
};

// Transform signal strength data for bar chart
export const transformSignalStrengthData = (rawData: any[]) => {
  if (!rawData || !Array.isArray(rawData)) return [];

  return rawData.map((item) => ({
    range: `${item.signal_range} dBm`,
    count: Number(item.count),
  }));
};

// Transform security types data for pie chart
export const transformSecurityData = (rawData: any[]) => {
  if (!rawData || !Array.isArray(rawData)) return [];

  return rawData
    .map((item) => ({
      name: item.security_type,
      value: Number(item.count),
      color: SECURITY_TYPE_COLORS[item.security_type] || '#64748b',
    }))
    .filter((item) => !isNaN(item.value) && item.value > 0);
};

// Transform threat distribution data for bar chart
export const transformThreatDistributionData = (rawData: any[]) => {
  if (!rawData || !Array.isArray(rawData)) return [];

  return rawData.map((item) => ({
    range: item.range,
    count: Number(item.count),
  }));
};

// Transform temporal activity data for bar chart
export const transformTemporalData = (rawData: any[]) => {
  if (!rawData || !Array.isArray(rawData)) return [];

  return rawData.map((item) => ({
    hour: item.hour,
    count: Number(item.count),
  }));
};

// Transform radio type over time data for line chart
export const transformRadioTimeData = (rawData: any[]) => {
  if (!rawData || !Array.isArray(rawData)) return [];

  const radioTimeMap = new Map();
  rawData.forEach((item) => {
    const dateKey = new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    if (!radioTimeMap.has(dateKey)) {
      radioTimeMap.set(dateKey, { label: dateKey });
    }
    radioTimeMap.get(dateKey)[item.network_type] = Number(item.count);
  });
  return Array.from(radioTimeMap.values());
};

// Transform threat trends data for line chart
export const transformThreatTrendsData = (rawData: any[]) => {
  if (!rawData || !Array.isArray(rawData)) return [];

  return rawData.map((item) => ({
    label: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    avgScore: Number(item.avg_score),
    criticalCount: Number(item.critical_count),
    highCount: Number(item.high_count),
  }));
};

// Transform top networks data for list display
export const transformTopNetworksData = (rawData: any[]) => {
  if (!rawData || !Array.isArray(rawData)) return [];

  return rawData.map((item) => ({
    bssid: item.bssid,
    ssid: item.ssid || '(hidden)',
    observations: Number(item.observation_count),
  }));
};

// Transform severity counts for bar/pie chart
export const transformSeverityCounts = (counts: any) => {
  if (!counts) return [];
  const severities = ['critical', 'high', 'medium', 'low'];
  return severities.map((sev) => ({
    name: sev.charAt(0).toUpperCase() + sev.slice(1),
    value: counts[sev] || 0,
    severity: sev, // for color mapping
  }));
};

// Type definitions for the transformed data
export interface NetworkTypeData {
  name: string;
  value: number;
  color: string;
}

export interface SignalStrengthData {
  range: string;
  count: number;
}

export interface SecurityData {
  name: string;
  value: number;
  color: string;
}

export interface ThreatDistributionData {
  range: string;
  count: number;
}

export interface TemporalData {
  hour: number;
  count: number;
}

export interface RadioTimeData {
  label: string;
  [networkType: string]: string | number;
}

export interface ThreatTrendsData {
  label: string;
  avgScore: number;
  criticalCount: number;
  highCount: number;
}

export interface TopNetworksData {
  bssid: string;
  ssid: string;
  observations: number;
}

export interface SeverityCountData {
  name: string;
  value: number;
  severity: string;
}

// ===== END FILE =====

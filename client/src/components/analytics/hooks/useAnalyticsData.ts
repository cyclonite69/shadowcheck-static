// ===== FILE: src/components/analytics/hooks/useAnalyticsData.ts =====
// PURPOSE: Custom hook for managing analytics data fetching and state
// EXTRACTS: Data fetching logic from lines 314-516 in original AnalyticsPage.tsx

import { useState, useEffect } from 'react';
import {
  transformNetworkTypesData,
  transformSignalStrengthData,
  transformSecurityData,
  transformThreatDistributionData,
  transformTemporalData,
  transformRadioTimeData,
  transformThreatTrendsData,
  transformTopNetworksData,
  transformSeverityCounts,
  NetworkTypeData,
  SignalStrengthData,
  SecurityData,
  ThreatDistributionData,
  TemporalData,
  RadioTimeData,
  ThreatTrendsData,
  TopNetworksData,
  SeverityCountData,
} from '../utils/dataTransformers';
import { DEBUG_ANALYTICS } from '../utils/chartConstants';

export interface AnalyticsData {
  networkTypes: NetworkTypeData[];
  signalStrength: SignalStrengthData[];
  security: SecurityData[];
  threatDistribution: ThreatDistributionData[];
  temporal: TemporalData[];
  radioTime: RadioTimeData[];
  threatTrends: ThreatTrendsData[];
  topNetworks: TopNetworksData[];
  severityCounts: SeverityCountData[];
}

export interface UseAnalyticsDataReturn {
  data: AnalyticsData;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useAnalyticsData = (debouncedFilterState: any): UseAnalyticsDataReturn => {
  const [data, setData] = useState<AnalyticsData>({
    networkTypes: [],
    signalStrength: [],
    security: [],
    threatDistribution: [],
    temporal: [],
    radioTime: [],
    threatTrends: [],
    topNetworks: [],
    severityCounts: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    const isAllTime = !debouncedFilterState?.enabled?.timeframe;
    if (DEBUG_ANALYTICS) {
      console.info('[analytics] fetchAnalytics start:', {
        isAllTime,
        debouncedFilterState,
        timeframeEnabled: debouncedFilterState?.enabled?.timeframe,
        filters: debouncedFilterState?.filters,
      });
    }
    setLoading(true);
    setError(null);

    try {
      if (DEBUG_ANALYTICS) {
        console.info('[analytics] fetch start', { isAllTime });
      }
      const params = new URLSearchParams({
        filters: JSON.stringify(debouncedFilterState.filters),
        enabled: JSON.stringify(debouncedFilterState.enabled),
      });

      // Parallel fetch for main analytics and severity counts
      const [res, severityRes] = await Promise.all([
        fetch(`/api/v2/networks/filtered/analytics?${params.toString()}`),
        fetch('/api/v2/threats/severity-counts'),
      ]);

      let payload = null;
      let severityPayload = null;

      try {
        payload = await res.json();
        if (severityRes.ok) severityPayload = await severityRes.json();
      } catch (parseError) {
        payload = null;
      }
      if (!res.ok || payload?.ok === false) {
        const message = payload?.message || payload?.error || `HTTP ${res.status}`;
        // Don't throw error for all-time queries that timeout - let them show empty state
        if (isAllTime && (res.status === 504 || message.includes('timeout'))) {
          if (DEBUG_ANALYTICS) {
            console.warn('[analytics] All-time query timed out, showing empty state');
          }
          // Return empty data instead of throwing
          const emptyData: AnalyticsData = {
            networkTypes: [],
            signalStrength: [],
            security: [],
            threatDistribution: [],
            temporal: [],
            radioTime: [],
            threatTrends: [],
            topNetworks: [],
            severityCounts: [],
          };
          setData(emptyData);
          return;
        }
        throw new Error(message);
      }
      const rawData = payload.data || {};

      // Transform and set all data types
      const transformedData: AnalyticsData = {
        networkTypes: rawData.networkTypes ? transformNetworkTypesData(rawData.networkTypes) : [],
        signalStrength: rawData.signalStrength
          ? transformSignalStrengthData(rawData.signalStrength)
          : [],
        security: rawData.security ? transformSecurityData(rawData.security) : [],
        threatDistribution: rawData.threatDistribution
          ? transformThreatDistributionData(rawData.threatDistribution)
          : [],
        temporal: rawData.temporalActivity ? transformTemporalData(rawData.temporalActivity) : [],
        radioTime: rawData.radioTypeOverTime
          ? transformRadioTimeData(rawData.radioTypeOverTime)
          : [],
        threatTrends: rawData.threatTrends ? transformThreatTrendsData(rawData.threatTrends) : [],
        topNetworks: rawData.topNetworks ? transformTopNetworksData(rawData.topNetworks) : [],
        severityCounts: severityPayload?.counts
          ? transformSeverityCounts(severityPayload.counts)
          : [],
      };

      if (DEBUG_ANALYTICS) {
        console.info('[analytics] Data transformed:', {
          networkTypes: transformedData.networkTypes.length,
          signalStrength: transformedData.signalStrength.length,
          security: transformedData.security.length,
          threatDistribution: transformedData.threatDistribution.length,
          temporal: transformedData.temporal.length,
          radioTime: transformedData.radioTime.length,
          threatTrends: transformedData.threatTrends.length,
          topNetworks: transformedData.topNetworks.length,
        });
      }

      setData(transformedData);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        if (DEBUG_ANALYTICS) {
          console.warn('[analytics] fetch error', err);
        }
      }
    } finally {
      setLoading(false);
      if (DEBUG_ANALYTICS) {
        console.info('[analytics] fetch end');
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchAnalytics();
    return () => controller.abort();
  }, [JSON.stringify(debouncedFilterState)]);

  const refetch = () => {
    fetchAnalytics();
  };

  return { data, loading, error, refetch };
};

// ===== END FILE =====

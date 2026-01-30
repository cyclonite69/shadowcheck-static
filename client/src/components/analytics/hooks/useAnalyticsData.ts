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
      // Use working analytics endpoints with real data
      const [
        networkTypes,
        signalStrength,
        security,
        topNetworks,
        threatDist,
        severityCounts,
        temporal,
        radioTime,
        threatTrends,
      ] = await Promise.all([
        fetch('/api/analytics/network-types'),
        fetch('/api/analytics/signal-strength'),
        fetch('/api/analytics/security'),
        fetch('/api/analytics/top-networks?limit=10'),
        fetch('/api/analytics/threat-distribution'),
        fetch('/api/v2/threats/severity-counts'),
        fetch('/api/analytics/temporal-activity'),
        fetch('/api/analytics/radio-type-over-time?range=all'),
        fetch('/api/analytics/threat-trends?range=all'),
      ]);

      let networkPayload = null;
      let signalPayload = null;
      let securityPayload = null;
      let topNetworksPayload = null;
      let threatPayload = null;
      let severityPayload = null;
      let temporalPayload = null;
      let radioTimePayload = null;
      let threatTrendsPayload = null;

      try {
        networkPayload = await networkTypes.json();
        signalPayload = await signalStrength.json();
        securityPayload = await security.json();
        topNetworksPayload = await topNetworks.json();
        threatPayload = await threatDist.json();
        severityPayload = await severityCounts.json();
        temporalPayload = await temporal.json();
        radioTimePayload = await radioTime.json();
        threatTrendsPayload = await threatTrends.json();
      } catch (parseError) {
        networkPayload = null;
      }

      if (!networkTypes.ok || networkPayload?.ok === false) {
        const message =
          networkPayload?.message || networkPayload?.error || `HTTP ${networkTypes.status}`;
        throw new Error(message);
      }

      // Transform real analytics data - no sample data
      const transformedData: AnalyticsData = {
        networkTypes: networkPayload?.data ? transformNetworkTypesData(networkPayload.data) : [],
        signalStrength: signalPayload?.data ? transformSignalStrengthData(signalPayload.data) : [],
        security: securityPayload?.data ? transformSecurityData(securityPayload.data) : [],
        threatDistribution: threatPayload?.data
          ? transformThreatDistributionData(threatPayload.data)
          : [],
        temporal: temporalPayload?.data ? transformTemporalData(temporalPayload.data) : [],
        radioTime: radioTimePayload?.data ? transformRadioTimeData(radioTimePayload.data) : [],
        threatTrends: threatTrendsPayload?.data
          ? transformThreatTrendsData(threatTrendsPayload.data)
          : [],
        topNetworks: topNetworksPayload?.data
          ? transformTopNetworksData(topNetworksPayload.data)
          : [],
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

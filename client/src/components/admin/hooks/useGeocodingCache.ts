import { useCallback, useEffect, useState } from 'react';
import type { GeocodingRunResult, GeocodingStats } from '../types/admin.types';

type GeocodingRunOptions = {
  provider: 'mapbox' | 'nominatim';
  mode: 'address-only' | 'poi-only' | 'both';
  limit: number;
  precision: number;
  perMinute: number;
  permanent?: boolean;
};

export const useGeocodingCache = (precision = 5) => {
  const [stats, setStats] = useState<GeocodingStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [lastResult, setLastResult] = useState<GeocodingRunResult | null>(null);

  const refreshStats = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/geocoding/stats?precision=${precision}`);
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      setStats(data.stats);
    } catch (err: any) {
      setError(err?.message || 'Failed to load geocoding stats');
    } finally {
      setIsLoading(false);
    }
  }, [precision]);

  const runGeocoding = useCallback(
    async (options: GeocodingRunOptions) => {
      setActionLoading(true);
      setActionMessage('');
      setError('');
      try {
        const response = await fetch('/api/admin/geocoding/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options),
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        setActionMessage(data.message || 'Geocoding run completed');
        setLastResult(data.result || null);
        await refreshStats();
      } catch (err: any) {
        setError(err?.message || 'Geocoding run failed');
      } finally {
        setActionLoading(false);
      }
    },
    [refreshStats]
  );

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return {
    stats,
    isLoading,
    actionLoading,
    error,
    actionMessage,
    lastResult,
    refreshStats,
    runGeocoding,
  };
};

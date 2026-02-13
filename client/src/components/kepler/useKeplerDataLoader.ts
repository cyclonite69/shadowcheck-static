import { useState, useEffect, useRef, useMemo } from 'react';
import { logDebug, logError } from '../../logging/clientLogger';
import { loadScript, loadCss } from './utils';
import type { NetworkData } from './types';

interface UseKeplerDataLoaderOptions {
  datasetType: 'observations' | 'networks';
  adaptedFilters: { filtersForPage: any; enabledForPage: any };
  initDeck: (token: string, data: NetworkData[]) => void;
  deckRef: React.RefObject<any>;
}

function processGeoJsonFeatures(features: any[]): NetworkData[] {
  return features
    .filter((f: any) => f.geometry && f.geometry.coordinates && f.geometry.coordinates.length >= 2)
    .map((f: any) => ({
      position: f.geometry.coordinates,
      bssid: f.properties.bssid || 'Unknown',
      ssid: f.properties.ssid || 'Hidden Network',
      signal: f.properties.bestlevel || f.properties.signal || f.properties.level || -90,
      level: f.properties.bestlevel || f.properties.signal || f.properties.level || -90,
      encryption: f.properties.encryption || 'Unknown',
      channel: f.properties.channel || 0,
      frequency: f.properties.frequency || 0,
      manufacturer: f.properties.manufacturer || 'Unknown',
      device_type: f.properties.device_type || 'Unknown',
      type: f.properties.type || 'W',
      capabilities: f.properties.capabilities || '',
      timestamp: f.properties.first_seen || f.properties.timestamp,
      last_seen: f.properties.last_seen || f.properties.timestamp,
      device_id: f.properties.device_id,
      source_tag: f.properties.source_tag,
      accuracy: f.properties.accuracy,
      altitude: f.properties.altitude,
      obs_count:
        f.properties.obs_count || f.properties.observation_count || f.properties.observations || 0,
      threat_level: f.properties.threat_level,
      threat_score: f.properties.threat_score,
      is_suspicious: f.properties.is_suspicious,
      distance_from_home: f.properties.distance_from_home,
      max_distance_km: f.properties.max_distance_km,
      timespan_days: f.properties.timespan_days,
      unique_days: f.properties.unique_days,
    }));
}

export function useKeplerDataLoader({
  datasetType,
  adaptedFilters,
  initDeck,
  deckRef,
}: UseKeplerDataLoaderOptions) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [networkData, setNetworkData] = useState<NetworkData[]>([]);
  const [actualCounts, setActualCounts] = useState<{
    observations: number;
    networks: number;
  } | null>(null);
  const scriptsLoadedRef = useRef<boolean>(false);

  const filterKey = useMemo(() => JSON.stringify(adaptedFilters), [adaptedFilters]);

  const loadData = async (type: 'observations' | 'networks') => {
    try {
      logDebug(`[Kepler] loadData called, type: ${type}`);
      setLoading(true);
      setError('');

      const endpoint =
        type === 'observations' ? '/api/kepler/observations' : '/api/kepler/networks';

      const { filtersForPage, enabledForPage } = adaptedFilters;
      const params = new URLSearchParams();
      params.set('filters', JSON.stringify(filtersForPage));
      params.set('enabled', JSON.stringify(enabledForPage));

      const endpointWithFilters = `${endpoint}?${params}`;
      logDebug(`[Kepler] Fetching from: ${endpointWithFilters}`);

      const [tokenRes, dataRes] = await Promise.all([
        fetch('/api/mapbox-token'),
        fetch(endpointWithFilters),
      ]);

      logDebug('[Kepler] Fetch complete, parsing...');
      const tokenData = await tokenRes.json();
      const geojson = await dataRes.json();

      logDebug(`[Kepler] Data received, features: ${geojson.features?.length || 0}`);

      if (!tokenData?.token) {
        throw new Error('Mapbox token missing. Set it in Admin.');
      }
      if (geojson.error) throw new Error(`API Error: ${geojson.error}`);
      if (!geojson.features || !Array.isArray(geojson.features))
        throw new Error(`Invalid data format`);
      if (geojson.features.length === 0) throw new Error('No network data found');

      const processedData = processGeoJsonFeatures(geojson.features);

      if (type === 'observations') {
        setActualCounts((prev) => ({
          observations: processedData.length,
          networks: prev?.networks || 0,
        }));
      } else {
        setActualCounts((prev) => ({
          observations: prev?.observations || 0,
          networks: processedData.length,
        }));
      }

      // Reinitialize deck if needed
      if (!deckRef.current || !window.deck) {
        await Promise.all([
          loadCss('https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css'),
          loadScript('https://cdn.jsdelivr.net/npm/deck.gl@8.9.0/dist.min.js'),
          loadScript('https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'),
        ]);
        try {
          initDeck(tokenData.token, processedData);
        } catch (initError) {
          throw new Error('Kepler failed to initialize. Check console.');
        }
      }

      setNetworkData(processedData);
      setLoading(false);
    } catch (err: any) {
      logError('Error loading data', err);
      setError(err?.message || 'Failed to load network data');
      setLoading(false);
    }
  };

  // Load scripts once
  useEffect(() => {
    if (scriptsLoadedRef.current) return;

    const setup = async () => {
      try {
        logDebug('[Kepler] Loading scripts...');
        await Promise.all([
          loadCss('https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css'),
          loadScript('https://cdn.jsdelivr.net/npm/deck.gl@8.9.0/dist.min.js'),
          loadScript('https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'),
        ]);
        scriptsLoadedRef.current = true;
        logDebug('[Kepler] Scripts loaded');
        if (window.deck && window.mapboxgl) {
          loadData(datasetType);
        }
      } catch (err: any) {
        logError('Error loading scripts', err);
        setError('Failed to load required libraries');
      }
    };

    setup();
  }, []);

  // Load data when filters/dataset change
  useEffect(() => {
    if (!scriptsLoadedRef.current || !window.deck || !window.mapboxgl) {
      return;
    }

    logDebug(`[Kepler] Loading data, filterKey: ${filterKey.substring(0, 100)}`);
    loadData(datasetType);
  }, [datasetType, filterKey]);

  return { networkData, loading, error, actualCounts };
}

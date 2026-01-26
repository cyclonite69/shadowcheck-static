import { useState, useEffect } from 'react';
import { ApiHealth } from '../types/admin.types';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const API_PRESETS: { label: string; path: string; method: HttpMethod }[] = [
  // Core APIs
  { label: 'Health', path: '/health', method: 'GET' },
  { label: 'Dashboard Metrics', path: '/api/dashboard/metrics', method: 'GET' },

  // Network APIs
  { label: 'Networks', path: '/api/explorer/networks?limit=10', method: 'GET' },
  { label: 'Network Details', path: '/api/networks/observations/00:11:22:33:44:55', method: 'GET' },
  { label: 'Threats Quick', path: '/api/threats/quick', method: 'GET' },

  // Analytics APIs
  { label: 'Analytics Overview', path: '/api/analytics/overview', method: 'GET' },
  { label: 'Analytics Timeline', path: '/api/analytics/timeline', method: 'GET' },
  { label: 'Analytics Heatmap', path: '/api/analytics/heatmap', method: 'GET' },

  // Geospatial APIs
  { label: 'Mapbox Token', path: '/api/mapbox-token', method: 'GET' },
  { label: 'Geospatial Data', path: '/api/geospatial/data?limit=50', method: 'GET' },

  // WiGLE APIs
  { label: 'WiGLE Status', path: '/api/wigle/api-status', method: 'GET' },
  { label: 'WiGLE Search', path: '/api/wigle/search', method: 'GET' },

  // Settings APIs
  { label: 'WiGLE Settings', path: '/api/settings/wigle', method: 'GET' },
  { label: 'Mapbox Settings', path: '/api/settings/mapbox', method: 'GET' },

  // ML APIs
  { label: 'ML Status', path: '/api/ml/status', method: 'GET' },
  { label: 'ML Train', path: '/api/ml/train', method: 'POST' },

  // Data APIs
  { label: 'Kepler Data', path: '/api/kepler/data?limit=50', method: 'GET' },
  { label: 'Export CSV', path: '/api/export/csv?limit=100', method: 'GET' },
  { label: 'Export JSON', path: '/api/export/json?limit=100', method: 'GET' },
];

export const useApiTesting = () => {
  const [endpoint, setEndpoint] = useState('/api/health');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [body, setBody] = useState('');
  const [apiLoading, setApiLoading] = useState(false);
  const [apiResult, setApiResult] = useState<any>(null);
  const [apiError, setApiError] = useState('');
  const [apiHealth, setApiHealth] = useState<ApiHealth | null>(null);

  const loadApiHealth = async () => {
    try {
      const res = await fetch('/health');
      const data = await res.json();
      setApiHealth({ status: 'Online', version: data.version || '1.0.0' });
    } catch {
      setApiHealth({ status: 'Offline', version: 'N/A' });
    }
  };

  const runApiRequest = async () => {
    setApiError('');
    setApiResult(null);
    setApiLoading(true);
    const start = performance.now();
    try {
      const opts: RequestInit = { method };
      if (method !== 'GET' && method !== 'DELETE' && body.trim()) {
        opts.headers = { 'Content-Type': 'application/json' };
        opts.body = body;
      }
      const res = await fetch(endpoint, opts);
      const text = await res.text();
      setApiResult({
        ok: res.ok,
        status: res.status,
        durationMs: Math.round(performance.now() - start),
        body: text,
      });
    } catch (err: any) {
      setApiError(err?.message || 'Request failed');
    } finally {
      setApiLoading(false);
    }
  };

  return {
    endpoint,
    setEndpoint,
    method,
    setMethod,
    body,
    setBody,
    apiLoading,
    apiResult,
    apiError,
    apiHealth,
    loadApiHealth,
    runApiRequest,
    API_PRESETS,
  };
};

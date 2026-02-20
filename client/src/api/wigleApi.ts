/**
 * WiGLE API
 */

import { apiClient } from './client';

export const wigleApi = {
  // WiGLE API Status
  async getApiStatus(): Promise<any> {
    return apiClient.get('/wigle/api-status');
  },

  // WiGLE Search
  async searchWigle(params: URLSearchParams): Promise<any> {
    return apiClient.get(`/wigle/search-api?${params.toString()}`);
  },

  // WiGLE Detail
  async getWigleObservations(netid: string): Promise<any> {
    return apiClient.get(`/wigle/observations/${encodeURIComponent(netid)}`);
  },

  async getWigleDetail(
    bssid: string,
    isBluetooth: boolean,
    importData: boolean = true
  ): Promise<any> {
    const endpoint = isBluetooth
      ? `/wigle/detail/bt/${encodeURIComponent(bssid)}`
      : `/wigle/detail/${encodeURIComponent(bssid)}`;
    return apiClient.post(endpoint, { import: importData });
  },

  // FormData — raw fetch (apiClient forces application/json header)
  async importWigleV3(formData: FormData): Promise<any> {
    const res = await fetch('/api/wigle/import/v3', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    return res.json();
  },

  // Network WiGLE Observations
  async getNetworkWigleObservations(bssid: string): Promise<any> {
    return apiClient.get(`/networks/${encodeURIComponent(bssid)}/wigle-observations`);
  },

  // Mapbox Token (for WiGLE map)
  async getMapboxToken(): Promise<any> {
    return apiClient.get('/mapbox-token');
  },

  // Arbitrary caller-supplied path — raw fetch (apiClient would double-prefix /api/)
  async searchLocalWigle(endpoint: string, params: URLSearchParams): Promise<any> {
    const res = await fetch(`${endpoint}?${params.toString()}`, { credentials: 'include' });
    return res.json();
  },
};

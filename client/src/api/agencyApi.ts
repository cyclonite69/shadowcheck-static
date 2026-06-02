/**
 * Agency API
 */

import { apiClient } from './client';

interface AgencyOffice {
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  phone: string;
  website: string;
  latitude: number;
  longitude: number;
  distance_meters?: number;
}

interface NearestAgenciesResponse {
  ok: boolean;
  bssid: string;
  agencies: AgencyOffice[];
  count: number;
  radius_km: number;
}

interface NearestAgenciesBatchResponse {
  ok: boolean;
  bssids: string[];
  agencies: AgencyOffice[];
  count: number;
  radius_km: number;
}

export interface CourthouseMatch {
  cluster_id?: number;
  cluster_count?: number;
  has_wigle_obs?: boolean;
  has_local_obs?: boolean;
  id: number;
  name: string;
  short_name?: string;
  courthouse_type: string;
  district: string;
  circuit: string;
  city: string;
  state: string;
  postal_code?: string;
  latitude: number;
  longitude: number;
  distance_meters?: number;
}

export const agencyApi = {
  async getNearestAgenciesBatch(
    bssids: string[],
    radius: number = 250
  ): Promise<NearestAgenciesBatchResponse> {
    return apiClient.post<NearestAgenciesBatchResponse>(
      `/networks/nearest-agencies/batch?radius=${radius}`,
      { bssids }
    );
  },

  async getNearestAgencies(bssid: string, radius: number): Promise<NearestAgenciesResponse> {
    return apiClient.get<NearestAgenciesResponse>(
      `/networks/nearest-agencies/${encodeURIComponent(bssid)}?radius=${radius}`
    );
  },

  async getNearestCourthousesBatch(
    bssids: string[],
    radius: number = 250
  ): Promise<{ ok: boolean; courthouses: CourthouseMatch[]; count: number; radius_km: number }> {
    return apiClient.post(`/networks/nearest-courthouses/batch?radius=${radius}`, { bssids });
  },

  // Agency Offices (GeoJSON)
  async getAgencyOffices(): Promise<any> {
    const response = await fetch('/agency-offices', { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch agency offices');
    return response.json();
  },

  async getFederalCourthouses(): Promise<any> {
    const response = await fetch('/federal-courthouses', { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch federal courthouses');
    return response.json();
  },

  async getDeflockCameras(): Promise<any> {
    const response = await fetch('/api/v1/surveillance/deflock-cameras', {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch DeFlock cameras');
    return response.json();
  },

  async getShotspotterSensors(): Promise<any> {
    const response = await fetch('/api/v1/surveillance/shotspotter-sensors', {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch ShotSpotter sensors');
    return response.json();
  },
};

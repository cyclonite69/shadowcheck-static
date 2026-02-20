/**
 * Mapbox API
 */

import { apiClient } from './client';

interface MapboxTokenResponse {
  token: string;
  error?: string;
}

interface GeocodingFeature {
  id: string;
  type: string;
  place_type: string[];
  relevance: number;
  properties: Record<string, unknown>;
  text: string;
  place_name: string;
  center: [number, number];
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  context?: Array<{
    id: string;
    text: string;
  }>;
}

interface GeocodingResponse {
  type: string;
  query: string[];
  features: GeocodingFeature[];
  attribution: string;
}

export const mapboxApi = {
  async getMapboxToken(): Promise<MapboxTokenResponse> {
    return apiClient.get<MapboxTokenResponse>('/mapbox-token');
  },

  // Returns text/xml not JSON — raw fetch
  async exportKML(bssids: string): Promise<string> {
    const response = await fetch(`/api/kml?bssids=${encodeURIComponent(bssids)}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to export KML');
    return response.text();
  },

  // External Mapbox API — raw fetch (no internal auth needed)
  async geocodeSearch(
    query: string,
    token: string,
    params?: Record<string, string>
  ): Promise<GeocodingResponse> {
    const searchParams = new URLSearchParams({
      access_token: token,
      ...params,
    });
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${searchParams.toString()}`
    );
    return response.json();
  },
};

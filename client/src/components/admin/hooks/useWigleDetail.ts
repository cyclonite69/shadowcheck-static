import { useState } from 'react';

export interface WigleDetailData {
  networkId: string;
  name: string | null;
  ssid?: string;
  encryption: string;
  type: string;
  channel: number;
  firstSeen: string;
  lastSeen: string;
  lastUpdate: string;
  trilateratedLatitude: number;
  trilateratedLongitude: number;
  streetAddress?: {
    city?: string;
    region?: string;
    country?: string;
    road?: string;
    housenumber?: string;
    postalcode?: string;
  };
  locationClusters?: Array<{
    centroidLatitude: number;
    centroidLongitude: number;
    score: number;
    locations?: Array<{
      latitude: number;
      longitude: number;
      signal: number;
      time: string;
    }>;
  }>;
}

export const useWigleDetail = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WigleDetailData | null>(null);
  const [imported, setImported] = useState(false);

  const fetchDetail = async (netid: string, shouldImport: boolean) => {
    if (!netid) {
      setError('Network ID (BSSID) is required');
      return;
    }

    setLoading(true);
    setError(null);
    setImported(false);
    setData(null);

    try {
      const response = await fetch(`/api/wigle/detail/${encodeURIComponent(netid)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ import: shouldImport }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.details || json.error || 'Failed to fetch WiGLE detail');
      }

      setData(json.data);
      setImported(json.imported);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    data,
    imported,
    fetchDetail,
  };
};

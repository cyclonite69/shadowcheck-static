import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { renderNetworkTooltip } from '../../../utils/geospatial/renderNetworkTooltip';
import { normalizeTooltipData } from '../../../utils/geospatial/tooltipDataNormalizer';
import type { WigleDetailData } from './useWigleDetail';
import type { WigleObservation } from './useWigleDetectionEvidence';

export interface UseWigleTooltipPreviewOptions {
  data: WigleDetailData | null;
  selectedObs: WigleObservation | null;
  observations: WigleObservation[];
}

export interface UseWigleTooltipPreviewResult {
  tooltipContainerRef: React.RefObject<HTMLDivElement | null>;
  tooltipHtml: string | null;
}

function mapWigleType(type?: string | null): string {
  switch (type?.toLowerCase()) {
    case 'gsm':
      return 'G';
    case 'lte':
      return 'L';
    case 'ble':
      return 'E';
    case 'bt':
      return 'B';
    case 'wifi':
    default:
      return 'W';
  }
}

export const useWigleTooltipPreview = ({
  data,
  selectedObs,
  observations,
}: UseWigleTooltipPreviewOptions): UseWigleTooltipPreviewResult => {
  const tooltipContainerRef = useRef<HTMLDivElement | null>(null);
  const [tooltipHtml, setTooltipHtml] = useState<string | null>(null);

  useEffect(() => {
    const el = tooltipContainerRef.current;
    if (!el || !data) {
      setTooltipHtml(null);
      return;
    }

    const normalized = normalizeTooltipData({
      ...data,
      netid: data.networkId,
      ssid: selectedObs?.ssid || data.ssid || data.name,
      type: mapWigleType(data.type),
      observation_count: observations?.length || 0,
      accuracy: data.locationClusters?.[0]?.accuracy || null,
      geocoded_address: data.streetAddress?.housenumber
        ? `${data.streetAddress.housenumber} ${data.streetAddress.road}, ${data.streetAddress.city}, ${data.streetAddress.region} ${data.streetAddress.postalcode}`
        : undefined,
      city: data.streetAddress?.city,
      region: data.streetAddress?.region,
      qos: data.bestClusterWiGLEQoS,
      comment: data.comment,
      first_seen: data.firstSeen,
      last_seen: data.lastSeen,
      ...(selectedObs && {
        lat: selectedObs.latitude,
        lon: selectedObs.longitude,
        signal: selectedObs.signal,
        altitude: selectedObs.altitude,
        time: selectedObs.observed_at,
      }),
    });

    setTooltipHtml(renderNetworkTooltip({ ...normalized, triggerElement: el }));
  }, [data, selectedObs, observations]);

  return {
    tooltipContainerRef,
    tooltipHtml,
  };
};

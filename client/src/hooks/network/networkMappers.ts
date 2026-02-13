import type { NetworkRow, ThreatInfo } from '../../types/network';

/** Format security capabilities string into a human-readable label */
export const formatSecurity = (
  capabilities: string | null | undefined,
  fallback?: string | null
) => {
  const value = String(capabilities || '').toUpperCase();
  if (!value || value === 'UNKNOWN') {
    return fallback || 'Open';
  }
  const hasWpa3 = value.includes('WPA3');
  const hasWpa2 = value.includes('WPA2');
  const hasWpa = value.includes('WPA');
  const hasWep = value.includes('WEP');
  const hasPsk = value.includes('PSK');
  const hasEap = value.includes('EAP');
  const hasSae = value.includes('SAE');
  const hasOwe = value.includes('OWE');

  if (hasOwe) return 'OWE';
  if (hasWpa3 && hasSae) return 'WPA3-SAE';
  if (hasWpa3 && hasEap) return 'WPA3-EAP';
  if (hasWpa3) return 'WPA3';
  if (hasWpa2 && hasEap) return 'WPA2-EAP';
  if (hasWpa2 && hasPsk) return 'WPA2-PSK';
  if (hasWpa2) return 'WPA2';
  if (hasWpa && hasEap) return 'WPA-EAP';
  if (hasWpa && hasPsk) return 'WPA-PSK';
  if (hasWpa) return 'WPA';
  if (hasWep) return 'WEP';
  return fallback || 'Open';
};

/** Calculate WiFi channel from frequency in MHz */
export const calculateChannel = (freq: number | null): number | null => {
  if (!freq || typeof freq !== 'number') return null;

  // 2.4GHz channels (1-14)
  if (freq >= 2412 && freq <= 2484) {
    if (freq === 2484) return 14;
    return Math.floor((freq - 2412) / 5) + 1;
  }

  // 5GHz channels
  if (freq >= 5000 && freq <= 5900) {
    return Math.floor((freq - 5000) / 5);
  }

  // 6GHz channels
  if (freq >= 5925 && freq <= 7125) {
    return Math.floor((freq - 5925) / 5);
  }

  return null;
};

/** Infer network type from available data */
export const inferNetworkType = (
  dbType: string | null,
  frequency: number | null,
  ssid: string | null,
  capabilities: string | null
): NetworkRow['type'] => {
  if (dbType && dbType !== '?' && dbType !== 'Unknown' && dbType !== null) {
    return dbType as NetworkRow['type'];
  }

  const ssidUpper = String(ssid || '').toUpperCase();
  const capUpper = String(capabilities || '').toUpperCase();

  // Frequency-based inference (most reliable)
  if (frequency) {
    if (frequency >= 2412 && frequency <= 2484) return 'W';
    if (frequency >= 5000 && frequency <= 5900) return 'W';
    if (frequency >= 5925 && frequency <= 7125) return 'W';
  }

  // Capability-based inference
  if (
    capUpper.includes('WPA') ||
    capUpper.includes('WEP') ||
    capUpper.includes('WPS') ||
    capUpper.includes('RSN') ||
    capUpper.includes('ESS') ||
    capUpper.includes('CCMP') ||
    capUpper.includes('TKIP')
  ) {
    return 'W';
  }

  // SSID-based inference
  if (ssidUpper.includes('5G') || capUpper.includes('NR')) return 'N';
  if (ssidUpper.includes('LTE') || ssidUpper.includes('4G')) return 'L';
  if (ssidUpper.includes('BLUETOOTH') || capUpper.includes('BLUETOOTH')) {
    if (capUpper.includes('LOW ENERGY') || capUpper.includes('BLE')) return 'E';
    return 'B';
  }

  return '?';
};

/** Calculate timespan in days between two dates */
export const calculateTimespan = (first: string | null, last: string | null): number | null => {
  if (!first || !last) return null;
  const firstDate = new Date(first);
  const lastDate = new Date(last);
  if (isNaN(firstDate.getTime()) || isNaN(lastDate.getTime())) return null;
  const diffMs = lastDate.getTime() - firstDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

/** Parse threat info from API response */
export const parseThreatInfo = (threat: any, bssid: string): ThreatInfo => {
  if (threat === true) {
    return {
      score: 1,
      level: 'HIGH',
      summary: 'Signal above threat threshold',
    };
  } else if (threat && typeof threat === 'object') {
    const t = threat as {
      score?: number | string;
      level?: string;
      summary?: string;
      debug?: any;
    };
    const apiScore =
      typeof t.score === 'string' ? parseFloat(t.score) : typeof t.score === 'number' ? t.score : 0;

    return {
      score: apiScore / 100,
      level: (t.level || 'NONE') as 'NONE' | 'LOW' | 'MED' | 'HIGH',
      summary: t.summary || `Threat level: ${t.level || 'NONE'}`,
      debug: t.debug || undefined,
    };
  }

  return {
    score: 0,
    level: 'NONE',
    summary: 'No threat analysis available',
  };
};

/** Map an API row to a typed NetworkRow */
export const mapApiRowToNetwork = (row: any, idx: number): NetworkRow => {
  const securityValue = formatSecurity(row.capabilities, row.security);
  const bssidValue = (row.bssid || `unknown-${idx}`).toString().toUpperCase();
  const frequency = typeof row.frequency === 'number' ? row.frequency : null;
  const networkType = inferNetworkType(row.type, frequency, row.ssid, row.capabilities);
  const isWiFi = networkType === 'W';
  const threatInfo = parseThreatInfo(row.threat, bssidValue);

  const channelValue =
    typeof row.channel === 'number' ? row.channel : isWiFi ? calculateChannel(frequency) : null;

  return {
    bssid: bssidValue,
    ssid: row.ssid || '(hidden)',
    type: networkType,
    signal: typeof row.signal === 'number' ? row.signal : null,
    security: securityValue,
    frequency: frequency,
    channel: channelValue,
    observations: parseInt(String(row.obs_count || 0), 10),
    latitude: typeof row.lat === 'number' ? row.lat : null,
    longitude: typeof row.lon === 'number' ? row.lon : null,
    distanceFromHome:
      typeof row.distance_from_home_km === 'number' ? row.distance_from_home_km * 1000 : null,
    accuracy: typeof row.accuracy_meters === 'number' ? row.accuracy_meters : null,
    firstSeen: row.first_observed_at || null,
    lastSeen: row.last_observed_at || row.observed_at || null,
    timespanDays: calculateTimespan(row.first_observed_at, row.last_observed_at),
    threat: threatInfo,
    threat_score: threatInfo ? threatInfo.score * 100 : 0,
    threat_level: threatInfo ? threatInfo.level : 'NONE',
    threat_rule_score: threatInfo?.debug?.rule_score ?? null,
    threat_ml_score: threatInfo?.debug?.ml_score ?? null,
    threat_ml_weight: threatInfo?.debug?.evidence_weight ?? null,
    threat_ml_boost: threatInfo?.debug?.ml_boost ?? null,
    threatReasons: [],
    threatEvidence: [],
    stationaryConfidence:
      typeof row.stationary_confidence === 'number' ? row.stationary_confidence : null,
    manufacturer: row.manufacturer || null,
    min_altitude_m: typeof row.min_altitude_m === 'number' ? row.min_altitude_m : null,
    max_altitude_m: typeof row.max_altitude_m === 'number' ? row.max_altitude_m : null,
    altitude_span_m: typeof row.altitude_span_m === 'number' ? row.altitude_span_m : null,
    max_distance_meters:
      typeof row.max_distance_meters === 'number' ? row.max_distance_meters : null,
    last_altitude_m: typeof row.last_altitude_m === 'number' ? row.last_altitude_m : null,
    is_sentinel: typeof row.is_sentinel === 'boolean' ? row.is_sentinel : null,
    rawLatitude:
      typeof row.raw_lat === 'number' ? row.raw_lat : typeof row.lat === 'number' ? row.lat : null,
    rawLongitude:
      typeof row.raw_lon === 'number' ? row.raw_lon : typeof row.lon === 'number' ? row.lon : null,
  };
};

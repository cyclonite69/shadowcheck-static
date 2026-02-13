import { useFilterStore } from '../../stores/filterStore';

const toFiniteNumber = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Serialize filter state into URLSearchParams for the /api/networks endpoint.
 */
export function serializeFiltersToParams(
  filters: any,
  enabled: any,
  sort: string,
  order: string,
  limit: number,
  offset: number,
  locationMode: string,
  planCheck: boolean
): URLSearchParams {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    sort,
    order,
  });
  params.set('location_mode', locationMode);

  if (planCheck) {
    params.set('planCheck', '1');
  }

  // Identity filters
  if (enabled.ssid && filters.ssid) {
    params.set('ssid', String(filters.ssid));
  }
  if (enabled.bssid && filters.bssid) {
    params.set('bssid', String(filters.bssid));
  }

  // Array filters
  if (enabled.radioTypes && Array.isArray(filters.radioTypes) && filters.radioTypes.length > 0) {
    params.set('radioTypes', filters.radioTypes.join(','));
  }
  if (
    enabled.encryptionTypes &&
    Array.isArray(filters.encryptionTypes) &&
    filters.encryptionTypes.length > 0
  ) {
    params.set('encryptionTypes', filters.encryptionTypes.join(','));
  }
  if (enabled.authMethods && Array.isArray(filters.authMethods) && filters.authMethods.length > 0) {
    params.set('authMethods', filters.authMethods.join(','));
  }
  if (
    enabled.insecureFlags &&
    Array.isArray(filters.insecureFlags) &&
    filters.insecureFlags.length > 0
  ) {
    params.set('insecureFlags', filters.insecureFlags.join(','));
  }
  if (
    enabled.securityFlags &&
    Array.isArray(filters.securityFlags) &&
    filters.securityFlags.length > 0
  ) {
    params.set('securityFlags', filters.securityFlags.join(','));
  }

  // Range filters
  if (enabled.rssiMin && filters.rssiMin !== undefined) {
    params.set('min_signal', String(filters.rssiMin));
  }
  if (enabled.rssiMax && filters.rssiMax !== undefined) {
    params.set('max_signal', String(filters.rssiMax));
  }
  if (enabled.observationCountMin && filters.observationCountMin !== undefined) {
    params.set('min_obs_count', String(filters.observationCountMin));
  }
  if (enabled.observationCountMax && filters.observationCountMax !== undefined) {
    params.set('max_obs_count', String(filters.observationCountMax));
  }

  // Threat categories
  if (
    enabled.threatCategories &&
    Array.isArray(filters.threatCategories) &&
    filters.threatCategories.length > 0
  ) {
    params.set('threat_categories', JSON.stringify(filters.threatCategories));
  }

  // Distance filters
  const maxDistance = toFiniteNumber(filters.distanceFromHomeMax);
  if (enabled.distanceFromHomeMax && maxDistance !== null) {
    params.set('distance_from_home_km_max', String(maxDistance / 1000));
  }
  const minDistance = toFiniteNumber(filters.distanceFromHomeMin);
  if (enabled.distanceFromHomeMin && minDistance !== null) {
    params.set('distance_from_home_km_min', String(minDistance / 1000));
  }

  // Bounding box filter
  if (enabled.boundingBox && filters.boundingBox) {
    const { north, south, east, west } = filters.boundingBox;
    const minLat = toFiniteNumber(south);
    const maxLat = toFiniteNumber(north);
    const minLng = toFiniteNumber(west);
    const maxLng = toFiniteNumber(east);

    if (
      minLat !== null &&
      maxLat !== null &&
      minLng !== null &&
      maxLng !== null &&
      minLat >= -90 &&
      maxLat <= 90 &&
      minLat <= maxLat &&
      minLng >= -180 &&
      maxLng <= 180 &&
      minLng <= maxLng
    ) {
      params.set('bbox_min_lat', String(minLat));
      params.set('bbox_max_lat', String(maxLat));
      params.set('bbox_min_lng', String(minLng));
      params.set('bbox_max_lng', String(maxLng));
    }
  }

  // Radius filter
  if (enabled.radiusFilter && filters.radiusFilter) {
    const { latitude, longitude, radiusMeters } = filters.radiusFilter;
    const centerLat = toFiniteNumber(latitude);
    const centerLng = toFiniteNumber(longitude);
    const radius = toFiniteNumber(radiusMeters);

    if (
      centerLat !== null &&
      centerLng !== null &&
      radius !== null &&
      centerLat >= -90 &&
      centerLat <= 90 &&
      centerLng >= -180 &&
      centerLng <= 180 &&
      radius > 0
    ) {
      params.set('radius_center_lat', String(centerLat));
      params.set('radius_center_lng', String(centerLng));
      params.set('radius_meters', String(radius));
    }
  }

  // Live distance filters (overrides debounced for distance sliders)
  const liveState = useFilterStore.getState().getAPIFilters();
  const liveMaxDistance = toFiniteNumber(liveState.filters.distanceFromHomeMax);
  if (liveState.enabled.distanceFromHomeMax && liveMaxDistance !== null) {
    params.set('distance_from_home_km_max', String(liveMaxDistance / 1000));
  }
  const liveMinDistance = toFiniteNumber(liveState.filters.distanceFromHomeMin);
  if (liveState.enabled.distanceFromHomeMin && liveMinDistance !== null) {
    params.set('distance_from_home_km_min', String(liveMinDistance / 1000));
  }

  // Timeframe filter
  if (enabled.timeframe && filters.timeframe?.type === 'relative') {
    const window = filters.timeframe.relativeWindow || '30d';
    const unit = window.slice(-2) === 'mo' ? 'mo' : window.slice(-1);
    const value = parseInt(window.slice(0, unit === 'mo' ? -2 : -1), 10);
    if (!Number.isNaN(value)) {
      let ms;
      if (unit === 'h') {
        ms = value * 3600000;
      } else if (unit === 'm') {
        ms = value * 60000;
      } else if (unit === 'mo') {
        ms = value * 30.44 * 86400000;
      } else if (unit === 'y') {
        ms = value * 365 * 86400000;
      } else {
        ms = value * 86400000;
      }
      const since = new Date(Date.now() - ms).toISOString();
      params.set('last_seen', since);
    }
  }

  return params;
}

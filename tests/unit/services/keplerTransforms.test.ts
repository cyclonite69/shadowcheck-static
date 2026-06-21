import {
  inferRadioType,
  buildKeplerDataGeoJson,
  buildKeplerObservationsGeoJson,
  buildKeplerNetworksGeoJson,
  KeplerNetworkRow,
  KeplerObsRow,
} from '../../../server/src/services/kepler/keplerTransforms';

describe('keplerTransforms', () => {
  describe('inferRadioType', () => {
    it('returns the radioType if already present and valid', () => {
      expect(inferRadioType('W', 'SomeSSID', 2412, 'WPA')).toBe('W');
      expect(inferRadioType('L', null, null, null)).toBe('L');
    });

    it('infers cellular N (5G NR)', () => {
      expect(inferRadioType(null, 'My5GNet', null, null)).toBe('N');
      expect(inferRadioType(null, null, null, '5G NR')).toBe('N');
      expect(inferRadioType('', null, null, 'NR')).toBe('N');
    });

    it('infers cellular L (LTE)', () => {
      expect(inferRadioType(null, 'SuperLTE', null, null)).toBe('L');
      expect(inferRadioType(null, 'Carrier4G', null, null)).toBe('L');
      expect(inferRadioType(null, null, null, 'EARFCN')).toBe('L');
    });

    it('infers cellular D (3G/WCDMA/UMTS)', () => {
      expect(inferRadioType(null, 'WCDMANet', null, null)).toBe('D');
      expect(inferRadioType(null, '3G-Service', null, null)).toBe('D');
      expect(inferRadioType(null, null, null, 'UARFCN')).toBe('D');
    });

    it('infers cellular G (2G/GSM)', () => {
      expect(inferRadioType(null, 'GSM-Gateway', null, null)).toBe('G');
      expect(inferRadioType(null, '2G-Net', null, null)).toBe('G');
      expect(inferRadioType(null, null, null, 'ARFCN')).toBe('G');
    });

    it('infers cellular C (CDMA)', () => {
      expect(inferRadioType(null, 'CDMA-Cell', null, null)).toBe('C');
      expect(inferRadioType(null, null, null, 'CDMA')).toBe('C');
    });

    it('infers cellular L via carrier keyword matching', () => {
      expect(inferRadioType(null, 'VERIZON_WiFi', null, null)).toBe('L');
      expect(inferRadioType(null, 'T-MOBILE-FREE', null, null)).toBe('L');
    });

    it('infers BLE E', () => {
      expect(inferRadioType(null, 'BLE_Device', null, null)).toBe('E');
      expect(inferRadioType(null, 'BTLE-Tag', null, null)).toBe('E');
      expect(inferRadioType(null, null, null, 'BLUETOOTH LOW ENERGY')).toBe('E');
    });

    it('infers Bluetooth B or E based on low energy capabilities', () => {
      expect(inferRadioType(null, 'BLUETOOTH_HEADSET', null, 'CLASSIC')).toBe('B');
      expect(inferRadioType(null, 'BLUETOOTH_TAG', null, 'BLE')).toBe('E');
      expect(inferRadioType(null, 'BLUETOOTH_TAG', null, 'LOW ENERGY')).toBe('E');
    });

    it('infers WiFi W from frequency', () => {
      expect(inferRadioType(null, null, 2412, null)).toBe('W');
      expect(inferRadioType(null, null, 5180, null)).toBe('W');
      expect(inferRadioType(null, null, 6000, null)).toBe('W');
    });

    it('infers WiFi W from capabilities', () => {
      expect(inferRadioType(null, null, null, 'WPA2-PSK-CCMP')).toBe('W');
      expect(inferRadioType(null, null, null, 'WEP')).toBe('W');
    });

    it('returns ? as fallback for unrecognized patterns', () => {
      expect(inferRadioType(null, 'PlainNet', null, 'NONE')).toBe('?');
      expect(inferRadioType(null, null, 1200, null)).toBe('?');
    });

    it('infers WiFi W from 6GHz frequency boundaries', () => {
      expect(inferRadioType(null, null, 5925, null)).toBe('W');
      expect(inferRadioType(null, null, 7125, null)).toBe('W');
      expect(inferRadioType(null, null, 7200, null)).toBe('?');
    });
  });

  describe('GeoJSON builders', () => {
    const mockNetworkRows: KeplerNetworkRow[] = [
      {
        bssid: '00:11:22:33:44:55',
        ssid: 'TestNet',
        signal: -75,
        lon: -122.4,
        lat: 37.7,
        first_seen: null,
        last_seen: null,
        observed_at: null,
        manufacturer: 'Apple',
        type: 'W',
        frequency: 2412,
        capabilities: 'WPA',
        last_altitude_m: 10,
        accuracy_meters: 5,
        observations: 42,
        threat: { level: 'SUSPECT', score: 60 },
        distance_from_home_km: 1.2,
        max_distance_meters: 15,
        unique_days: 2,
        first_observed_at: '2026-06-13T00:00:00.000Z',
        last_observed_at: '2026-06-13T12:00:00.000Z',
        geocoded_address: '123 Main St',
        geocoded_poi_name: 'Main POI',
      },
      {
        bssid: '22:33:44:55:66:77',
        ssid: null, // Hidden network
        signal: null,
        lon: null, // Null coordinates should be filtered out
        lat: null,
        first_seen: null,
        last_seen: null,
        observed_at: null,
        manufacturer: null,
        type: null,
        frequency: null,
        capabilities: null,
        last_altitude_m: null,
        accuracy_meters: null,
        observations: null,
        threat: null,
        distance_from_home_km: null,
        max_distance_meters: null,
        unique_days: null,
        first_observed_at: null,
        last_observed_at: null,
      },
    ];

    it('buildKeplerDataGeoJson builds valid FeatureCollection and filters null coords', () => {
      const geojson = buildKeplerDataGeoJson(mockNetworkRows, 100);

      expect(geojson.type).toBe('FeatureCollection');
      expect(geojson.actualCounts.observations).toBe(100);
      expect(geojson.actualCounts.networks).toBe(2); // Both networks are counted in actualCounts
      expect(geojson.features).toHaveLength(1);

      const feature = geojson.features[0];
      expect(feature.geometry.type).toBe('Point');
      expect(feature.geometry.coordinates).toEqual([-122.4, 37.7]);
      expect(feature.properties.ssid).toBe('TestNet');
      expect(feature.properties.manufacturer).toBe('Apple');
      expect(feature.properties.threat_level).toBe('SUSPECT');
      expect(feature.properties.threat_score).toBe(60);
    });

    it('buildKeplerNetworksGeoJson builds networks GeoJSON', () => {
      const geojson = buildKeplerNetworksGeoJson(mockNetworkRows, 50);

      expect(geojson.type).toBe('FeatureCollection');
      expect(geojson.actualCounts.observations).toBe(50);
      expect(geojson.features).toHaveLength(1);
      expect(geojson.features[0].properties.bssid).toBe('00:11:22:33:44:55');
    });

    it('buildKeplerObservationsGeoJson builds observations GeoJSON with calculated timespans', () => {
      const mockObsRows: KeplerObsRow[] = [
        {
          bssid: '00:11:22:33:44:55',
          ssid: 'TestNet',
          level: -70,
          lon: -122.4,
          lat: 37.7,
          time: '2026-06-13T00:00:00.000Z',
          manufacturer: 'Apple',
          radio_type: 'W',
          radio_frequency: 2412,
          radio_capabilities: 'WPA',
          device_id: 'dev1',
          source_tag: 'tag1',
          altitude: 10,
          accuracy: 5,
          threat_level: 'SUSPECT',
          threat_score: 60,
          distance_from_home_km: 1.2,
          first_observed_at: '2026-06-12T00:00:00.000Z',
          last_observed_at: '2026-06-14T00:00:00.000Z', // 2 days difference
          observations: 10,
          unique_days: 3,
          max_distance_meters: 1000,
          stationary_confidence: 0.9,
          geocoded_address: '123 Main St',
          geocoded_poi_name: 'Main POI',
        },
      ];

      const geojson = buildKeplerObservationsGeoJson(mockObsRows, 10);

      expect(geojson.type).toBe('FeatureCollection');
      expect(geojson.actualCounts.observations).toBe(10);
      expect(geojson.features).toHaveLength(1);

      const properties = geojson.features[0].properties;
      expect(properties.timespan_days).toBe(2);
      expect(properties.max_distance_km).toBe(1);
      expect(properties.stationary_confidence).toBe(0.9);
      expect(properties.geocoded_address).toBe('123 Main St');
    });

    it('buildActualCounts falls back observations count to 0 if rowCount is null or undefined', () => {
      const geojsonNull = buildKeplerDataGeoJson([], null);
      expect(geojsonNull.actualCounts.observations).toBe(0);

      const geojsonUndefined = buildKeplerDataGeoJson([], undefined);
      expect(geojsonUndefined.actualCounts.observations).toBe(0);
    });

    it('buildKeplerDataGeoJson uses fallback values for missing or null properties', () => {
      const incompleteRows: KeplerNetworkRow[] = [
        {
          bssid: '00:11:22:33:44:55',
          ssid: null,
          signal: null,
          lon: -122.4,
          lat: 37.7,
          first_seen: null,
          last_seen: null,
          observed_at: null,
          manufacturer: null,
          type: null,
          frequency: null,
          capabilities: null,
          last_altitude_m: null,
          accuracy_meters: null,
          observations: null,
          threat: null,
          distance_from_home_km: null,
          max_distance_meters: null,
          unique_days: null,
          first_observed_at: null,
          last_observed_at: null,
        },
      ];

      const geojson = buildKeplerDataGeoJson(incompleteRows, 0);
      const props = geojson.features[0].properties;

      expect(props.ssid).toBe('Hidden Network');
      expect(props.bestlevel).toBe(0);
      expect(props.signal).toBe(0);
      expect(props.level).toBe(0);
      expect(props.manufacturer).toBe('Unknown');
      expect(props.type).toBe('?');
      expect(props.threat_level).toBeNull();
      expect(props.threat_score).toBeNull();
      expect(props.observation_count).toBe(0);
      expect(props.obs_count).toBe(0);
      expect(props.unique_days).toBe(0);
      expect(props.max_distance_meters).toBe(0);
    });

    it('buildKeplerObservationsGeoJson uses fallback values for missing or null properties and timespans', () => {
      const incompleteObsRows: KeplerObsRow[] = [
        {
          bssid: '00:11:22:33:44:55',
          ssid: null,
          level: null,
          lon: -122.4,
          lat: 37.7,
          time: null,
          manufacturer: null,
          radio_type: null,
          radio_frequency: null,
          radio_capabilities: null,
          device_id: null,
          source_tag: null,
          altitude: null,
          accuracy: null,
          threat_level: null,
          threat_score: null,
          distance_from_home_km: null,
          first_observed_at: null,
          last_observed_at: null,
          observations: null,
          unique_days: null,
          max_distance_meters: null,
          stationary_confidence: null,
        },
      ];

      const geojson = buildKeplerObservationsGeoJson(incompleteObsRows, 0);
      const props = geojson.features[0].properties;

      expect(props.ssid).toBe('Hidden Network');
      expect(props.bestlevel).toBe(0);
      expect(props.signal).toBe(0);
      expect(props.level).toBe(0);
      expect(props.manufacturer).toBe('Unknown');
      expect(props.type).toBe('?');
      expect(props.threat_level).toBeNull();
      expect(props.threat_score).toBeNull();
      expect(props.observation_count).toBe(0);
      expect(props.obs_count).toBe(0);
      expect(props.unique_days).toBe(0);
      expect(props.max_distance_meters).toBe(0);
      expect(props.max_distance_km).toBe(0);
      expect(props.timespan_days).toBe(0);
      expect(props.stationary_confidence).toBeNull();
    });

    it('buildKeplerNetworksGeoJson uses fallback values for missing or null properties', () => {
      const incompleteRows: KeplerNetworkRow[] = [
        {
          bssid: '00:11:22:33:44:55',
          ssid: null,
          signal: null,
          lon: -122.4,
          lat: 37.7,
          first_seen: null,
          last_seen: null,
          observed_at: null,
          manufacturer: null,
          type: null,
          frequency: null,
          capabilities: null,
          last_altitude_m: null,
          accuracy_meters: null,
          observations: null,
          threat: null,
          distance_from_home_km: null,
          max_distance_meters: null,
          unique_days: null,
          first_observed_at: null,
          last_observed_at: null,
        },
      ];

      const geojson = buildKeplerNetworksGeoJson(incompleteRows, 0);
      const props = geojson.features[0].properties;

      expect(props.ssid).toBe('Hidden Network');
      expect(props.bestlevel).toBe(0);
      expect(props.signal).toBe(0);
      expect(props.level).toBe(0);
      expect(props.manufacturer).toBe('Unknown');
      expect(props.type).toBe('?');
      expect(props.threat_level).toBeNull();
      expect(props.threat_score).toBeNull();
      expect(props.observation_count).toBe(0);
      expect(props.obs_count).toBe(0);
      expect(props.unique_days).toBe(0);
      expect(props.max_distance_meters).toBe(0);
    });
  });
});

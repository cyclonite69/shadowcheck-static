/**
 * SQL expressions and sort column map for the network list route.
 * Separated to reduce the main handler's size and improve readability.
 */

export {};

const { NETWORK_CHANNEL_EXPR } = require('../../../services/filterQueryBuilder/sqlExpressions');

const typeExpr = `
  CASE
    WHEN ne.type IS NOT NULL AND ne.type <> '?' THEN
      CASE
        WHEN UPPER(ne.type) IN ('W', 'WIFI', 'WI-FI') THEN 'W'
        WHEN UPPER(ne.type) IN ('E', 'BLE', 'BTLE', 'BLUETOOTHLE', 'BLUETOOTH_LOW_ENERGY') THEN 'E'
        WHEN UPPER(ne.type) IN ('B', 'BT', 'BLUETOOTH') THEN 'B'
        WHEN UPPER(ne.type) IN ('L', 'LTE', '4G') THEN 'L'
        WHEN UPPER(ne.type) IN ('N', 'NR', '5G') THEN 'N'
        WHEN UPPER(ne.type) IN ('G', 'GSM', '2G') THEN 'G'
        WHEN UPPER(ne.type) IN ('C', 'CDMA') THEN 'C'
        WHEN UPPER(ne.type) IN ('D', '3G', 'UMTS') THEN 'D'
        WHEN UPPER(ne.type) IN ('F', 'NFC') THEN 'F'
        ELSE UPPER(ne.type)
      END
    WHEN ne.frequency BETWEEN 2412 AND 7125 THEN 'W'
    WHEN COALESCE(ne.security, '') ~* '(WPA|WEP|ESS|RSN|CCMP|TKIP|OWE|SAE)' THEN 'W'
    WHEN COALESCE(ne.security, '') ~* '(BLE|BTLE|BLUETOOTH.?LOW.?ENERGY)' THEN 'E'
    WHEN COALESCE(ne.security, '') ~* '(BLUETOOTH)' THEN 'B'
    ELSE '?'
  END
`;

const channelExpr = NETWORK_CHANNEL_EXPR('ne');

const threatScoreExpr = `COALESCE(
  CASE
    WHEN nt.threat_tag = 'FALSE_POSITIVE' THEN 0
    WHEN nt.threat_tag = 'INVESTIGATE' THEN COALESCE(nts.final_threat_score, 0)::numeric
    WHEN nt.threat_tag = 'THREAT' THEN (COALESCE(nts.final_threat_score, 0)::numeric * 0.7 + COALESCE(nt.threat_confidence, 0)::numeric * 100 * 0.3)
    ELSE (COALESCE(nts.final_threat_score, 0)::numeric * 0.7 + COALESCE(nt.threat_confidence, 0)::numeric * 100 * 0.3)
  END,
  0
)`;

const threatLevelExpr = `CASE
  WHEN nt.threat_tag = 'FALSE_POSITIVE' THEN 'NONE'
  WHEN nt.threat_tag = 'INVESTIGATE' THEN COALESCE(nts.final_threat_level, 'NONE')
  ELSE (
    CASE
      WHEN ${threatScoreExpr} >= 80 THEN 'CRITICAL'
      WHEN ${threatScoreExpr} >= 60 THEN 'HIGH'
      WHEN ${threatScoreExpr} >= 40 THEN 'MED'
      WHEN ${threatScoreExpr} >= 20 THEN 'LOW'
      ELSE 'NONE'
    END
  )
END`;

const threatOrderExpr = `CASE ${threatLevelExpr}
  WHEN 'CRITICAL' THEN 4
  WHEN 'HIGH' THEN 3
  WHEN 'MED' THEN 2
  WHEN 'LOW' THEN 1
  ELSE 0
END`;

const sortColumnMap: Record<string, string> = {
  last_seen: 'ne.last_seen',
  last_observed_at: 'ne.last_seen',
  first_observed_at: 'ne.first_seen',
  observed_at: 'ne.observed_at',
  ssid: 'lower(ne.ssid)',
  bssid: 'ne.bssid',
  type: typeExpr,
  security: 'ne.security',
  signal: 'ne.signal',
  frequency: 'ne.frequency',
  channel: channelExpr,
  obs_count: 'ne.observations',
  observations: 'ne.observations',
  distance_from_home_km: 'distance_from_home_km',
  accuracy_meters: 'ne.accuracy_meters',
  avg_signal: 'ne.signal',
  min_signal: 'ne.signal',
  max_signal: 'ne.signal',
  unique_days: 'ne.unique_days',
  unique_locations: 'ne.unique_locations',
  threat: threatOrderExpr,
  threat_score: `(${threatScoreExpr})::numeric`,
  threat_rule_score: "COALESCE((nts.ml_feature_values->>'rule_score')::numeric, 0)",
  threat_ml_score: "COALESCE((nts.ml_feature_values->>'ml_score')::numeric, 0)",
  threat_ml_weight: "COALESCE((nts.ml_feature_values->>'evidence_weight')::numeric, 0)",
  threat_ml_boost: "COALESCE((nts.ml_feature_values->>'ml_boost')::numeric, 0)",
  threat_level: threatOrderExpr,
  lat: 'ne.lat',
  lon: 'ne.lon',
  manufacturer: 'lower(rm.manufacturer)',
  manufacturer_address: 'lower(rm.address)',
  capabilities: 'ne.security',
  min_altitude_m: 'ne.min_altitude_m',
  max_altitude_m: 'ne.max_altitude_m',
  altitude_span_m: 'ne.altitude_span_m',
  max_distance_meters: 'ne.max_distance_meters',
  last_altitude_m: 'ne.last_altitude_m',
  is_sentinel: 'ne.is_sentinel',
  timespan_days: 'EXTRACT(EPOCH FROM (ne.last_seen - ne.first_seen)) / 86400.0',
};

const indexedSorts = new Set([
  'bssid',
  'last_seen',
  'first_observed_at',
  'observed_at',
  'ssid',
  'signal',
  'obs_count',
  'distance_from_home_km',
  'max_distance_meters',
]);

const selectColumns = [
  'ne.bssid',
  'ne.ssid',
  `TRIM(ne.type) AS type`,
  `ne.frequency`,
  `ne.signal`,
  `ne.lat`,
  `ne.lon`,
  `ne.last_seen`,
  `ne.first_seen`,
  `ne.observations`,
  `ne.accuracy_meters`,
  `ne.security`,
  `ne.channel`,
  `ne.wps`,
  `ne.battery`,
  `ne.altitude_m`,
  `ne.min_altitude_m`,
  `ne.max_altitude_m`,
  `ne.altitude_accuracy_m`,
  `ne.max_distance_meters`,
  `ne.last_altitude_m`,
  `ne.unique_days`,
  `ne.unique_locations`,
  `ne.is_sentinel`,
  `rm.manufacturer`,
  `rm.address`,
];

module.exports = {
  typeExpr,
  channelExpr,
  threatScoreExpr,
  threatLevelExpr,
  threatOrderExpr,
  sortColumnMap,
  indexedSorts,
  selectColumns,
};

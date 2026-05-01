-- ============================================================================
-- SIBLING OVERRIDE ANALYSIS
-- Extract all confirmed sibling pairs with full feature set for ruleset refinement
-- ============================================================================

WITH override_pairs AS (
  SELECT 
    o.bssid1,
    o.bssid2,
    n1.ssid AS ssid1,
    n2.ssid AS ssid2,
    n1.type AS type1,
    n2.type AS type2,
    n1.frequency AS freq1,
    n2.frequency AS freq2,
    COALESCE(n1.bestlat, n1.lastlat) AS lat1,
    COALESCE(n1.bestlon, n1.lastlon) AS lon1,
    COALESCE(n2.bestlat, n2.lastlat) AS lat2,
    COALESCE(n2.bestlon, n2.lastlon) AS lon2,
    n1.observation_count AS obs1,
    n2.observation_count AS obs2,
    o.relation,
    o.is_active,
    o.notes,
    o.created_at
  FROM app.network_sibling_overrides o
  LEFT JOIN app.networks n1 ON n1.bssid = o.bssid1
  LEFT JOIN app.networks n2 ON n2.bssid = o.bssid2
  WHERE o.is_active = true
),

-- Extract MAC octets and compute deltas
mac_analysis AS (
  SELECT
    bssid1, bssid2, ssid1, ssid2, type1, type2, freq1, freq2, lat1, lon1, lat2, lon2, obs1, obs2, relation, notes,
    substring(bssid1, 1, 8) AS oui1,
    substring(bssid2, 1, 8) AS oui2,
    substring(bssid1, 1, 14) AS first4_oui_1,
    substring(bssid2, 1, 14) AS first4_oui_2,
    substring(bssid1, 1, 11) AS first3_oui_1,
    substring(bssid2, 1, 11) AS first3_oui_2,
    -- Parse individual octets
    CAST(x'00' || substring(bssid1, 1, 2) AS integer) AS oct1_1,
    CAST(x'00' || substring(bssid2, 1, 2) AS integer) AS oct1_2,
    CAST(x'00' || substring(bssid1, 4, 2) AS integer) AS oct2_1,
    CAST(x'00' || substring(bssid2, 4, 2) AS integer) AS oct2_2,
    CAST(x'00' || substring(bssid1, 7, 2) AS integer) AS oct3_1,
    CAST(x'00' || substring(bssid2, 7, 2) AS integer) AS oct3_2,
    CAST(x'00' || substring(bssid1, 10, 2) AS integer) AS oct4_1,
    CAST(x'00' || substring(bssid2, 10, 2) AS integer) AS oct4_2,
    CAST(x'00' || substring(bssid1, 13, 2) AS integer) AS oct5_1,
    CAST(x'00' || substring(bssid2, 13, 2) AS integer) AS oct5_2,
    CAST(x'00' || substring(bssid1, 16, 2) AS integer) AS oct6_1,
    CAST(x'00' || substring(bssid2, 16, 2) AS integer) AS oct6_2
  FROM override_pairs
)

SELECT
  bssid1, bssid2,
  ssid1, ssid2,
  oui1, oui2,
  type1, type2,
  relation,
  -- MAC matching patterns
  CASE WHEN oui1 = oui2 THEN 'OUI_MATCH' ELSE 'OUI_DIFF' END AS oui_match,
  CASE WHEN first4_oui_1 = first4_oui_2 THEN 'FIRST4_MATCH' ELSE 'FIRST4_DIFF' END AS first4_match,
  CASE WHEN first3_oui_1 = first3_oui_2 THEN 'FIRST3_MATCH' ELSE 'FIRST3_DIFF' END AS first3_match,
  -- Octet-by-octet deltas
  ABS(oct1_1 - oct1_2) AS oct1_delta,
  ABS(oct2_1 - oct2_2) AS oct2_delta,
  ABS(oct3_1 - oct3_2) AS oct3_delta,
  ABS(oct4_1 - oct4_2) AS oct4_delta,
  ABS(oct5_1 - oct5_2) AS oct5_delta,
  ABS(oct6_1 - oct6_2) AS oct6_delta,
  -- Frequency and signal
  freq1, freq2,
  CASE WHEN freq1 = freq2 THEN 0 ELSE ABS(freq1 - freq2) END AS freq_delta,
  obs1, obs2,
  -- Distance if geolocation available
  CASE 
    WHEN lat1 IS NOT NULL AND lat2 IS NOT NULL THEN
      ROUND(ST_Distance(
        ST_SetSRID(ST_MakePoint(lon1, lat1), 4326)::geography,
        ST_SetSRID(ST_MakePoint(lon2, lat2), 4326)::geography
      )::numeric, 1)
    ELSE NULL
  END AS distance_m,
  -- SSID patterns
  CASE 
    WHEN ssid1 = ssid2 THEN 'SSID_EXACT'
    WHEN ssid1 IS NULL AND ssid2 IS NULL THEN 'SSID_BOTH_NULL'
    WHEN ssid1 IS NULL OR ssid2 IS NULL THEN 'SSID_ONE_NULL'
    WHEN lower(ssid1) = lower(ssid2) THEN 'SSID_CASE_INSENSITIVE'
    WHEN ssid1 LIKE ssid2 || '%' OR ssid2 LIKE ssid1 || '%' THEN 'SSID_PREFIX'
    ELSE 'SSID_DIFFERENT'
  END AS ssid_pattern,
  notes,
  created_at
FROM mac_analysis
ORDER BY relation DESC, oui1, bssid1, bssid2;

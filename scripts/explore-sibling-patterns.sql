-- ============================================================================
-- SIBLING PATTERN EXPLORATION QUERIES
-- Run these sequentially on EC2 to understand confirmed sibling characteristics
-- ============================================================================

-- ============================================================================
-- QUERY 1: SSID Distribution in confirmed siblings
-- Shows which SSIDs appear most in confirmed sibling groups
-- ============================================================================

SELECT 
  COALESCE(n1.ssid, 'NULL') as ssid,
  COUNT(*) as sibling_relationship_count,
  COUNT(DISTINCT o.bssid1) as unique_bssid1s,
  COUNT(DISTINCT o.bssid2) as unique_bssid2s,
  COUNT(DISTINCT o.bssid1) + COUNT(DISTINCT o.bssid2) as total_unique_bssids,
  string_agg(DISTINCT substring(n1.bssid, 1, 8), ', ' ORDER BY substring(n1.bssid, 1, 8)) as distinct_ouis
FROM app.network_sibling_overrides o
LEFT JOIN app.networks n1 ON n1.bssid = o.bssid1
WHERE o.relation = 'sibling' AND o.is_active = true
GROUP BY COALESCE(n1.ssid, 'NULL')
ORDER BY sibling_relationship_count DESC
LIMIT 50;


-- ============================================================================
-- QUERY 2: For each SSID, analyze MAC patterns
-- Shows first-5-octet groupings within each SSID
-- ============================================================================

WITH ssid_pairs AS (
  SELECT 
    COALESCE(n1.ssid, 'NULL') as ssid,
    o.bssid1, o.bssid2,
    substring(o.bssid1, 1, 14) as first4_oui_1,
    substring(o.bssid2, 1, 14) as first4_oui_2,
    substring(o.bssid1, 1, 8) as oui1,
    substring(o.bssid2, 1, 8) as oui2
  FROM app.network_sibling_overrides o
  LEFT JOIN app.networks n1 ON n1.bssid = o.bssid1
  WHERE o.relation = 'sibling' AND o.is_active = true
)
SELECT 
  ssid,
  CASE 
    WHEN first4_oui_1 = first4_oui_2 THEN 'FIRST4_MATCH'
    WHEN oui1 = oui2 THEN 'OUI_MATCH_ONLY'
    ELSE 'OUI_DIFFERENT'
  END as mac_pattern,
  COUNT(*) as pair_count,
  COUNT(DISTINCT LEAST(first4_oui_1, first4_oui_2)) as distinct_first4_groups
FROM ssid_pairs
GROUP BY ssid, mac_pattern
ORDER BY ssid, pair_count DESC;


-- ============================================================================
-- QUERY 3: For fleet SSIDs (mdt, PAS-RIG, GreatLakesMobile, xfinitywifi)
-- Analyze the MAC structure - how many distinct 5th-octet groups?
-- ============================================================================

WITH fleet_ssids AS (
  SELECT o.bssid1, o.bssid2, n1.ssid
  FROM app.network_sibling_overrides o
  LEFT JOIN app.networks n1 ON n1.bssid = o.bssid1
  WHERE o.relation = 'sibling' AND o.is_active = true
    AND (
      lower(COALESCE(n1.ssid, '')) IN ('mdt', 'pas-rig', 'greatlakesmobile', 'xfinitywifi')
      OR lower(COALESCE(n1.ssid, '')) LIKE 'pas-%'
    )
),
mac_parts AS (
  SELECT 
    ssid,
    bssid1 as bssid,
    substring(bssid1, 1, 14) as first4,
    substring(bssid1, 1, 11) as first3,
    substring(bssid1, 13, 2) as oct5,
    substring(bssid1, 16, 2) as oct6
  FROM fleet_ssids
  UNION ALL
  SELECT 
    ssid,
    bssid2,
    substring(bssid2, 1, 14),
    substring(bssid2, 1, 11),
    substring(bssid2, 13, 2),
    substring(bssid2, 16, 2)
  FROM fleet_ssids
)
SELECT 
  ssid,
  first4,
  COUNT(DISTINCT bssid) as bssids_in_group,
  COUNT(DISTINCT oct5) as distinct_oct5_values,
  string_agg(DISTINCT oct5, ',' ORDER BY oct5) as oct5_values,
  COUNT(DISTINCT oct6) as distinct_oct6_values,
  string_agg(DISTINCT oct6, ',' ORDER BY oct6) as oct6_values
FROM mac_parts
GROUP BY ssid, first4
ORDER BY ssid, first4;


-- ============================================================================
-- QUERY 4: Octet delta analysis for CONFIRMED SIBLINGS
-- For each SSID, what are the actual MAC deltas?
-- ============================================================================

WITH deltas AS (
  SELECT 
    COALESCE(n1.ssid, 'NULL') as ssid,
    o.bssid1, o.bssid2,
    ABS(
      CAST(x'00' || substring(o.bssid1, 16, 2) AS integer) -
      CAST(x'00' || substring(o.bssid2, 16, 2) AS integer)
    ) as oct6_delta,
    ABS(
      CAST(x'00' || substring(o.bssid1, 13, 2) AS integer) -
      CAST(x'00' || substring(o.bssid2, 13, 2) AS integer)
    ) as oct5_delta,
    ABS(
      CAST(x'00' || substring(o.bssid1, 10, 2) AS integer) -
      CAST(x'00' || substring(o.bssid2, 10, 2) AS integer)
    ) as oct4_delta,
    substring(o.bssid1, 1, 14) as first4_1,
    substring(o.bssid2, 1, 14) as first4_2,
    CASE WHEN substring(o.bssid1, 1, 14) = substring(o.bssid2, 1, 14) THEN 'MATCH' ELSE 'DIFF' END as first4_match
  FROM app.network_sibling_overrides o
  LEFT JOIN app.networks n1 ON n1.bssid = o.bssid1
  WHERE o.relation = 'sibling' AND o.is_active = true
)
SELECT 
  ssid,
  first4_match,
  oct6_delta,
  oct5_delta,
  oct4_delta,
  COUNT(*) as pair_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY ssid), 1) as pct_of_ssid
FROM deltas
GROUP BY ssid, first4_match, oct6_delta, oct5_delta, oct4_delta
ORDER BY ssid, pct_of_ssid DESC;


-- ============================================================================
-- QUERY 5: Single device SSIDs - do they have band-based patterns?
-- ============================================================================

WITH single_device_patterns AS (
  SELECT 
    COALESCE(n1.ssid, 'NULL') as ssid,
    COALESCE(n1.frequency, 0) as freq1,
    COALESCE(n2.frequency, 0) as freq2,
    CASE 
      WHEN COALESCE(n1.frequency, 0) IN (2412, 2437, 2462) AND COALESCE(n2.frequency, 0) IN (2412, 2437, 2462) THEN '2.4-2.4'
      WHEN COALESCE(n1.frequency, 0) IN (2412, 2437, 2462) AND COALESCE(n2.frequency, 0) > 5000 THEN '2.4-5'
      WHEN COALESCE(n1.frequency, 0) > 5000 AND COALESCE(n2.frequency, 0) > 5000 THEN '5-5'
      WHEN COALESCE(n1.frequency, 0) > 5000 AND COALESCE(n2.frequency, 0) IN (2412, 2437, 2462) THEN '5-2.4'
      ELSE 'OTHER'
    END as band_combo,
    COUNT(*) as pair_count
  FROM app.network_sibling_overrides o
  LEFT JOIN app.networks n1 ON n1.bssid = o.bssid1
  LEFT JOIN app.networks n2 ON n2.bssid = o.bssid2
  WHERE o.relation = 'sibling' AND o.is_active = true
  GROUP BY COALESCE(n1.ssid, 'NULL'), COALESCE(n1.frequency, 0), COALESCE(n2.frequency, 0)
)
SELECT 
  ssid,
  band_combo,
  SUM(pair_count) as total_pairs,
  ROUND(100.0 * SUM(pair_count) / SUM(SUM(pair_count)) OVER (PARTITION BY ssid), 1) as pct_of_ssid
FROM single_device_patterns
GROUP BY ssid, band_combo
ORDER BY ssid, total_pairs DESC;


-- ============================================================================
-- QUERY 6: The FALSE POSITIVE test case
-- Show all relationships involving mdt + 3-digit networks
-- ============================================================================

SELECT 
  o.bssid1, o.bssid2,
  COALESCE(n1.ssid, 'NULL') as ssid1,
  COALESCE(n2.ssid, 'NULL') as ssid2,
  o.relation,
  substring(o.bssid1, 1, 14) as first4_1,
  substring(o.bssid2, 1, 14) as first4_2,
  CASE WHEN substring(o.bssid1, 1, 14) = substring(o.bssid2, 1, 14) THEN 'MATCH' ELSE 'DIFF' END as first4_match
FROM app.network_sibling_overrides o
LEFT JOIN app.networks n1 ON n1.bssid = o.bssid1
LEFT JOIN app.networks n2 ON n2.bssid = o.bssid2
WHERE o.is_active = true
  AND (
    (lower(COALESCE(n1.ssid, '')) = 'mdt' OR lower(COALESCE(n1.ssid, '')) ~ '^[0-9]{3}$')
    OR
    (lower(COALESCE(n2.ssid, '')) = 'mdt' OR lower(COALESCE(n2.ssid, '')) ~ '^[0-9]{3}$')
  )
ORDER BY o.bssid1, o.bssid2;

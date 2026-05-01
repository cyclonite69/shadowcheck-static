#!/bin/bash
# ============================================================================
# Sibling Pattern Analysis Runner
# Run this on EC2 via SSM to extract sibling patterns
# ============================================================================
# Usage: bash analyze-siblings.sh > sibling-analysis-results.txt

set -e

echo "============================================================================"
echo "SIBLING PATTERN ANALYSIS - Starting $(date)"
echo "============================================================================"
echo ""

# QUERY 1: SSID Distribution
echo "---"
echo "QUERY 1: SSID Distribution in Confirmed Siblings"
echo "---"
docker exec shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_db -v ON_ERROR_STOP=1 << 'SQL1'
SELECT 
  COALESCE(n1.ssid, 'NULL') as ssid,
  COUNT(*) as sibling_relationship_count,
  COUNT(DISTINCT o.bssid1) + COUNT(DISTINCT o.bssid2) as total_unique_bssids,
  string_agg(DISTINCT substring(n1.bssid, 1, 8), ', ' ORDER BY substring(n1.bssid, 1, 8)) as distinct_ouis
FROM app.network_sibling_overrides o
LEFT JOIN app.networks n1 ON n1.bssid = o.bssid1
WHERE o.relation = 'sibling' AND o.is_active = true
GROUP BY COALESCE(n1.ssid, 'NULL')
ORDER BY sibling_relationship_count DESC
LIMIT 50;
SQL1

echo ""
echo "---"
echo "QUERY 2: MAC Pattern Analysis by SSID"
echo "---"
docker exec shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_db -v ON_ERROR_STOP=1 << 'SQL2'
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
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY ssid), 1) as pct_of_ssid
FROM ssid_pairs
GROUP BY ssid, mac_pattern
ORDER BY ssid, pair_count DESC;
SQL2

echo ""
echo "---"
echo "QUERY 3: Octet Delta Analysis (ALL CONFIRMED SIBLINGS)"
echo "---"
docker exec shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_db -v ON_ERROR_STOP=1 << 'SQL3'
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
ORDER BY ssid, first4_match DESC, pair_count DESC;
SQL3

echo ""
echo "---"
echo "QUERY 4: Fleet SSID Structure (mdt, PAS-RIG, GreatLakesMobile)"
echo "---"
docker exec shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_db -v ON_ERROR_STOP=1 << 'SQL4'
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
    substring(bssid1, 16, 2) as oct6
  FROM fleet_ssids
  UNION ALL
  SELECT 
    ssid,
    bssid2,
    substring(bssid2, 1, 14),
    substring(bssid2, 16, 2)
  FROM fleet_ssids
)
SELECT 
  ssid,
  first4,
  COUNT(DISTINCT bssid) as bssids_in_group,
  string_agg(DISTINCT oct6, ',' ORDER BY oct6) as oct6_values
FROM mac_parts
GROUP BY ssid, first4
ORDER BY ssid, first4;
SQL4

echo ""
echo "---"
echo "QUERY 5: Band Patterns (2.4 GHz vs 5 GHz Siblings)"
echo "---"
docker exec shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_db -v ON_ERROR_STOP=1 << 'SQL5'
SELECT 
  COALESCE(n1.ssid, 'NULL') as ssid,
  CASE 
    WHEN COALESCE(n1.frequency, 0) IN (2412, 2437, 2462, 2417, 2422, 2447, 2452, 2457) AND COALESCE(n2.frequency, 0) IN (2412, 2437, 2462, 2417, 2422, 2447, 2452, 2457) THEN '2.4-2.4'
    WHEN COALESCE(n1.frequency, 0) IN (2412, 2437, 2462, 2417, 2422, 2447, 2452, 2457) AND COALESCE(n2.frequency, 0) > 5000 THEN '2.4-5'
    WHEN COALESCE(n1.frequency, 0) > 5000 AND COALESCE(n2.frequency, 0) > 5000 THEN '5-5'
    WHEN COALESCE(n1.frequency, 0) > 5000 AND COALESCE(n2.frequency, 0) IN (2412, 2437, 2462, 2417, 2422, 2447, 2452, 2457) THEN '5-2.4'
    ELSE 'OTHER'
  END as band_combo,
  COUNT(*) as pair_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY COALESCE(n1.ssid, 'NULL')), 1) as pct_of_ssid
FROM app.network_sibling_overrides o
LEFT JOIN app.networks n1 ON n1.bssid = o.bssid1
LEFT JOIN app.networks n2 ON n2.bssid = o.bssid2
WHERE o.relation = 'sibling' AND o.is_active = true
GROUP BY COALESCE(n1.ssid, 'NULL'), band_combo
ORDER BY ssid, pair_count DESC;
SQL5

echo ""
echo "---"
echo "QUERY 6: The mdt Test Case (DC:60 ↔ DD:61 False Positive Check)"
echo "---"
docker exec shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_db -v ON_ERROR_STOP=1 << 'SQL6'
SELECT 
  o.bssid1, o.bssid2,
  COALESCE(n1.ssid, 'NULL') as ssid1,
  COALESCE(n2.ssid, 'NULL') as ssid2,
  o.relation,
  substring(o.bssid1, 1, 14) as first4_1,
  substring(o.bssid2, 1, 14) as first4_2,
  CASE WHEN substring(o.bssid1, 1, 14) = substring(o.bssid2, 1, 14) THEN 'MATCH' ELSE 'DIFF' END as first4_match,
  o.notes
FROM app.network_sibling_overrides o
LEFT JOIN app.networks n1 ON n1.bssid = o.bssid1
LEFT JOIN app.networks n2 ON n2.bssid = o.bssid2
WHERE o.is_active = true
  AND lower(COALESCE(n1.ssid, '')) = 'mdt'
ORDER BY o.bssid1, o.bssid2;
SQL6

echo ""
echo "============================================================================"
echo "ANALYSIS COMPLETE - $(date)"
echo "============================================================================"

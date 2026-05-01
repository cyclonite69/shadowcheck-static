#!/bin/bash
# Extract sibling override analysis from EC2 and save locally
# Usage: bash scripts/extract-sibling-analysis.sh > sibling-analysis-results.csv

set -e

# Get admin password from Secrets Manager
echo "Fetching password from AWS Secrets Manager..." >&2
DB_PASS=$(aws secretsmanager get-secret-value \
  --secret-id shadowcheck/config \
  --region us-east-1 \
  --query 'SecretString' \
  --output text 2>/dev/null | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('db_admin_password', ''))" 2>/dev/null || echo "")

if [ -z "$DB_PASS" ]; then
  echo "ERROR: Could not retrieve db_admin_password from AWS Secrets Manager" >&2
  echo "Make sure you have AWS credentials configured and can access shadowcheck/config" >&2
  exit 1
fi

echo "Querying sibling override patterns from EC2..." >&2

# Query the analysis from EC2
aws ssm start-session --target i-06380d0c9c99f6124 --region us-east-1 \
  --document-name "AWS-RunShellScript" \
  --parameters commands='[
    "export PGPASSWORD=\"'"$DB_PASS"'\"",
    "docker exec -e PGPASSWORD=$PGPASSWORD shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_db -v ON_ERROR_STOP=1 -F'\'','\'' -A << '"'"'SQL_QUERY'"'"'
$(cat <<'"'"'EOF_SQL'"'"'
WITH override_pairs AS (
  SELECT 
    o.bssid1, o.bssid2,
    n1.ssid AS ssid1, n2.ssid AS ssid2,
    n1.type AS type1, n2.type AS type2,
    n1.frequency AS freq1, n2.frequency AS freq2,
    COALESCE(n1.bestlat, n1.lastlat) AS lat1,
    COALESCE(n1.bestlon, n1.lastlon) AS lon1,
    COALESCE(n2.bestlat, n2.lastlat) AS lat2,
    COALESCE(n2.bestlon, n2.lastlon) AS lon2,
    o.relation, o.notes
  FROM app.network_sibling_overrides o
  LEFT JOIN app.networks n1 ON n1.bssid = o.bssid1
  LEFT JOIN app.networks n2 ON n2.bssid = o.bssid2
  WHERE o.is_active = true
),
mac_analysis AS (
  SELECT
    bssid1, bssid2, ssid1, ssid2, type1, type2, freq1, freq2, lat1, lon1, lat2, lon2, relation,
    substring(bssid1, 1, 8) AS oui1,
    substring(bssid2, 1, 8) AS oui2,
    substring(bssid1, 1, 14) AS first4_1,
    substring(bssid2, 1, 14) AS first4_2,
    CAST(x'"'"'00'"'"' || substring(bssid1, 16, 2) AS integer) AS oct6_1,
    CAST(x'"'"'00'"'"' || substring(bssid2, 16, 2) AS integer) AS oct6_2,
    CAST(x'"'"'00'"'"' || substring(bssid1, 10, 2) AS integer) AS oct4_1,
    CAST(x'"'"'00'"'"' || substring(bssid2, 10, 2) AS integer) AS oct4_2,
    CAST(x'"'"'00'"'"' || substring(bssid1, 13, 2) AS integer) AS oct5_1,
    CAST(x'"'"'00'"'"' || substring(bssid2, 13, 2) AS integer) AS oct5_2
  FROM override_pairs
)
SELECT
  bssid1, bssid2, ssid1, ssid2, type1, type2,
  oui1, oui2,
  CASE WHEN first4_1 = first4_2 THEN '"'"'MATCH'"'"' ELSE '"'"'DIFF'"'"' END AS first4_match,
  ABS(oct4_1 - oct4_2) AS oct4_delta,
  ABS(oct5_1 - oct5_2) AS oct5_delta,
  ABS(oct6_1 - oct6_2) AS oct6_delta,
  freq1, freq2,
  CASE WHEN freq1 = freq2 THEN 0 ELSE ABS(freq1 - freq2) END AS freq_delta,
  CASE 
    WHEN lat1 IS NOT NULL AND lat2 IS NOT NULL THEN
      ROUND(ST_Distance(
        ST_SetSRID(ST_MakePoint(lon1, lat1), 4326)::geography,
        ST_SetSRID(ST_MakePoint(lon2, lat2), 4326)::geography
      )::numeric, 1)
    ELSE NULL
  END AS distance_m,
  relation, notes
FROM mac_analysis
ORDER BY relation DESC, oui1, bssid1, bssid2
LIMIT 2000;
EOF_SQL
'"'"'
SQL_QUERY
    "
  ]' 2>&1 | grep -v "^Command ID\|Starting session\|Waiting\|Connection closed\|bssid\|^\-\-\-\-" | tail -1500

echo "" >&2
echo "Analysis complete" >&2

# Sibling Pattern Exploration - Step-by-Step

## Goal

Understand the patterns in the 1,429 confirmed sibling relationships so we can build a tight, accurate ruleset.

## Run on EC2

Connect to EC2 via SSM, then run the exploration queries one at a time:

```bash
# Get into the shadowcheck instance via SSM
aws ssm start-session --target i-06380d0c9c99f6124 --region us-east-1

# Then inside the session, run each query:

# QUERY 1: Which SSIDs have confirmed siblings?
cat > /tmp/q1.sql << 'EOF'
SELECT
  COALESCE(n1.ssid, 'NULL') as ssid,
  COUNT(*) as sibling_relationship_count,
  COUNT(DISTINCT o.bssid1) + COUNT(DISTINCT o.bssid2) as total_unique_bssids,
  string_agg(DISTINCT substring(n1.bssid, 1, 8), ', ') as distinct_ouis
FROM app.network_sibling_overrides o
LEFT JOIN app.networks n1 ON n1.bssid = o.bssid1
WHERE o.relation = 'sibling' AND o.is_active = true
GROUP BY COALESCE(n1.ssid, 'NULL')
ORDER BY sibling_relationship_count DESC
LIMIT 50;
EOF

docker exec -it shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_db < /tmp/q1.sql
```

The file `scripts/explore-sibling-patterns.sql` contains 6 detailed queries to run sequentially.

## What Each Query Shows

1. **QUERY 1:** SSID distribution - which SSIDs appear most in confirmed siblings
2. **QUERY 2:** MAC patterns by SSID - do siblings share first-4-octets or just OUI?
3. **QUERY 3:** Fleet SSID structure - for mdt, PAS-RIG, etc., how many units per SSID?
4. **QUERY 4:** Octet deltas - what are the actual MAC differences in confirmed siblings?
5. **QUERY 5:** Band patterns - how do 2.4 GHz vs 5 GHz siblings relate?
6. **QUERY 6:** The mdt test case - show all mdt + 3-digit confirmed siblings

## Analysis Approach

After running these queries on EC2:

1. **Identify SSID categories:**
   - Fleet SSIDs (mdt, PAS-RIG, etc.) — multiple units, each with unique MAC range
   - Single-device SSIDs (undertaker, etc.) — one device, multiple radios/bands

2. **Extract MAC constraints:**
   - For fleet SSIDs: what level of MAC must match? (first 4? 5?)
   - For single devices: what are the band-based patterns?

3. **Extract octet delta constraints:**
   - Which octets can differ, and by how much?
   - Are the patterns consistent per SSID or per manufacturer?

4. **Build ruleset v4:**
   - Tighter JOIN (first 5 octets instead of 2)
   - SSID-aware logic for fleet vs single-device patterns
   - Band-based checks for multi-radio devices

## Next Steps After Analysis

Once we understand the patterns:

- Build new `find_sibling_radios()` function with refined constraints
- Test on all 1,429 confirmed + 20 not_sibling pairs
- Measure accuracy (target: 90-95%)
- Deploy via migration
- Export as ML training data

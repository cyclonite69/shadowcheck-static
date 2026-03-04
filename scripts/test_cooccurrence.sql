-- Test Co-occurrence Detection on Sample Networks
-- Shows which networks will get bonuses and why

-- Step 1: Find network pairs that appear together frequently
SELECT 
    n1.ssid AS network1,
    nc.bssid1,
    n2.ssid AS network2,
    nc.bssid2,
    nc.cooccurrence_count,
    nc.locations_count,
    CASE 
        WHEN nc.cooccurrence_count >= 10 THEN LEAST(5 + 1, 15)
        ELSE 0
    END AS bonus_points
FROM app.network_cooccurrence nc
JOIN app.networks n1 ON n1.bssid = nc.bssid1
JOIN app.networks n2 ON n2.bssid = nc.bssid2
WHERE nc.cooccurrence_count >= 10
ORDER BY nc.cooccurrence_count DESC
LIMIT 20;

-- Step 2: Show non-fleet networks with co-occurrence bonuses
WITH network_manufacturer AS (
    SELECT 
        n.bssid,
        n.ssid,
        COALESCE(rm.manufacturer, 'Unknown') AS manufacturer
    FROM app.networks n
    LEFT JOIN app.radio_manufacturers rm ON UPPER(SUBSTRING(n.bssid, 1, 8)) = rm.oui
)
SELECT 
    nm.ssid,
    nm.bssid,
    nm.manufacturer,
    COUNT(DISTINCT nc.bssid2) + COUNT(DISTINCT nc2.bssid1) AS cooccurring_networks,
    SUM(COALESCE(nc.cooccurrence_count, 0)) + SUM(COALESCE(nc2.cooccurrence_count, 0)) AS total_cooccurrences,
    LEAST(5 + (COUNT(DISTINCT nc.bssid2) + COUNT(DISTINCT nc2.bssid1)), 15) AS bonus_points
FROM network_manufacturer nm
LEFT JOIN app.network_cooccurrence nc ON nc.bssid1 = nm.bssid AND nc.cooccurrence_count >= 10
LEFT JOIN app.network_cooccurrence nc2 ON nc2.bssid2 = nm.bssid AND nc2.cooccurrence_count >= 10
WHERE nm.manufacturer NOT ILIKE '%airlink%'
AND nm.manufacturer NOT ILIKE '%sierra%'
AND (nc.bssid1 IS NOT NULL OR nc2.bssid2 IS NOT NULL)
GROUP BY nm.ssid, nm.bssid, nm.manufacturer
HAVING COUNT(DISTINCT nc.bssid2) + COUNT(DISTINCT nc2.bssid1) > 0
ORDER BY bonus_points DESC, total_cooccurrences DESC
LIMIT 20;

-- Step 3: Sample a specific network to see its co-occurrence details
-- Replace 'PAS-323' with any SSID you want to test
SELECT 
    'Network being tested:' AS info,
    n.ssid,
    n.bssid,
    COALESCE(rm.manufacturer, 'Unknown') AS manufacturer
FROM app.networks n
LEFT JOIN app.radio_manufacturers rm ON UPPER(SUBSTRING(n.bssid, 1, 8)) = rm.oui
WHERE n.ssid = 'PAS-323';

SELECT 
    'Co-occurring with:' AS info,
    n2.ssid AS cooccurring_network,
    nc.bssid2,
    nc.cooccurrence_count,
    nc.locations_count
FROM app.networks n
JOIN app.network_cooccurrence nc ON nc.bssid1 = n.bssid
JOIN app.networks n2 ON n2.bssid = nc.bssid2
WHERE n.ssid = 'PAS-323'
AND nc.cooccurrence_count >= 10
ORDER BY nc.cooccurrence_count DESC;

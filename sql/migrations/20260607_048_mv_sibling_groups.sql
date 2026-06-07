BEGIN;

DROP MATERIALIZED VIEW IF EXISTS app.mv_sibling_groups;

CREATE MATERIALIZED VIEW app.mv_sibling_groups AS
WITH RECURSIVE trusted_pairs AS (
    SELECT bssid1, bssid2 FROM app.network_sibling_pairs
    WHERE corroborating_rules && ARRAY[
        'HP Aruba Cross-Band (Class A)',
        'Mist Systems Cross-Band (Class A)',
        'GM Vehicle Hotspot XOR (Class A)',
        'GM Vehicle Hotspot Shift (Class A)',
        'GM Vehicle Hotspot Oct4-0x10 (Class A)',
        'GM Vehicle Hotspot Oct4-0x60 (Class A)',
        'GM Vehicle Hotspot Oct4-0x20 (Class A)',
        'GM Vehicle Hotspot Seq (Class A)',
        'Ubiquiti UniFi VAP (Class A)',
        'Comcast Vantiva Sibling Rule',
        'Netgear Dual-Band',
        'Arcadyan HOME-EE7D'
    ]::text[]
),
symmetric_pairs AS (
    SELECT bssid1, bssid2 FROM trusted_pairs
    UNION ALL
    SELECT bssid2, bssid1 FROM trusted_pairs
),
components AS (
    SELECT bssid1 AS bssid, bssid1 AS root FROM trusted_pairs
    UNION
    SELECT bssid2, bssid2 FROM trusted_pairs
    UNION
    SELECT sp.bssid2, LEAST(c.root, sp.bssid2)
    FROM components c
    JOIN symmetric_pairs sp ON sp.bssid1 = c.bssid
),
settled AS (
    SELECT
        bssid,
        MIN(root) AS group_id,
        COUNT(*) OVER (PARTITION BY MIN(root)) AS group_size
    FROM components
    GROUP BY bssid
)
SELECT
    s.bssid,
    s.group_id,
    s.group_size,
    n.ssid,
    n.frequency,
    n.bestlat,
    n.bestlon,
    n.lasttime_ms,
    n.threat_level
FROM settled s
JOIN app.networks n ON n.bssid = s.bssid
WITH DATA;

CREATE UNIQUE INDEX ON app.mv_sibling_groups (bssid);
CREATE INDEX ON app.mv_sibling_groups (group_id);
CREATE INDEX ON app.mv_sibling_groups (group_id, frequency);
CREATE INDEX ON app.mv_sibling_groups (group_size);

COMMIT;

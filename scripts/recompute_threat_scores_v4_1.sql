-- Recompute Threat Scores v4.1 with Co-occurrence Detection
-- Usage: Full rescoring with coordinated surveillance detection

\timing on

SELECT 'Starting v4.1 scoring at ' || NOW() AS status;

-- Score mobile networks with v4.1 (includes co-occurrence)
WITH mobile_networks AS (
    SELECT n.bssid
    FROM app.networks n
    JOIN app.api_network_explorer_mv mv ON mv.bssid = n.bssid
    WHERE mv.max_distance_meters > 150
    AND mv.observations >= 2
    AND LENGTH(n.bssid) <= 17
    AND NOT EXISTS (
        SELECT 1 FROM app.network_tags nt
        WHERE nt.bssid = n.bssid AND nt.tag_name = 'ignored'
    )
),
stationary_networks AS (
    SELECT n.bssid
    FROM app.networks n
    JOIN app.api_network_explorer_mv mv ON mv.bssid = n.bssid
    WHERE (mv.max_distance_meters <= 150 OR mv.observations < 2)
    AND LENGTH(n.bssid) <= 17
    AND NOT EXISTS (
        SELECT 1 FROM app.network_tags nt
        WHERE nt.bssid = n.bssid AND nt.tag_name = 'ignored'
    )
),
-- Bulk assign NONE to stationary
stationary_scored AS (
    INSERT INTO app.network_threat_scores
        (bssid, rule_based_score, rule_based_flags, final_threat_score,
         final_threat_level, model_version, scored_at, updated_at)
    SELECT
        bssid,
        5,
        jsonb_build_object(
            'following_pattern', 0,
            'parked_surveillance', 0,
            'location_correlation', 0,
            'equipment_profile', 5,
            'temporal_persistence', 0,
            'fleet_correlation_bonus', 0,
            'cooccurrence_bonus', 0
        ),
        5,
        'NONE',
        '4.1-individual',
        NOW(),
        NOW()
    FROM stationary_networks
    ON CONFLICT (bssid) DO UPDATE SET
        rule_based_score = EXCLUDED.rule_based_score,
        rule_based_flags = EXCLUDED.rule_based_flags,
        final_threat_score = EXCLUDED.final_threat_score,
        final_threat_level = EXCLUDED.final_threat_level,
        model_version = EXCLUDED.model_version,
        scored_at = NOW(),
        updated_at = NOW()
    RETURNING bssid
),
-- Score mobile networks with v4.1
mobile_scored AS (
    SELECT
        m.bssid,
        calculate_threat_score_v4_1_individual(m.bssid) AS details
    FROM mobile_networks m
)
INSERT INTO app.network_threat_scores
    (bssid, rule_based_score, rule_based_flags, final_threat_score,
     final_threat_level, model_version, scored_at, updated_at)
SELECT
    bssid,
    (details->>'total_score')::numeric,
    details->'components',
    (details->>'total_score')::numeric,
    details->>'threat_level',
    details->>'model_version',
    NOW(),
    NOW()
FROM mobile_scored
ON CONFLICT (bssid) DO UPDATE SET
    rule_based_score = EXCLUDED.rule_based_score,
    rule_based_flags = EXCLUDED.rule_based_flags,
    final_threat_score = EXCLUDED.final_threat_score,
    final_threat_level = EXCLUDED.final_threat_level,
    model_version = EXCLUDED.model_version,
    scored_at = NOW(),
    updated_at = NOW();

SELECT 'Completed v4.1 individual scoring at ' || NOW() AS status;

-- Show distribution
SELECT 
    final_threat_level,
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM app.network_threat_scores
WHERE model_version LIKE '4.1%'
GROUP BY final_threat_level
ORDER BY 
    CASE final_threat_level
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        WHEN 'NONE' THEN 5
    END;

-- Show top co-occurrence networks
SELECT 
    n.ssid,
    nts.bssid,
    nts.final_threat_score,
    nts.final_threat_level,
    (nts.rule_based_flags->>'cooccurrence_bonus')::numeric AS cooccurrence_bonus
FROM app.network_threat_scores nts
JOIN app.networks n ON n.bssid = nts.bssid
WHERE nts.model_version LIKE '4.1%'
AND (nts.rule_based_flags->>'cooccurrence_bonus')::numeric > 0
ORDER BY (nts.rule_based_flags->>'cooccurrence_bonus')::numeric DESC
LIMIT 20;

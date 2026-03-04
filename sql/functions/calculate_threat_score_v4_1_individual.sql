-- Threat Model v4.1: Individual Scoring with Co-occurrence Bonus
-- Enhanced from v4.0 with coordinated surveillance detection

CREATE OR REPLACE FUNCTION app.calculate_threat_score_v4_1_individual(target_bssid VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB;
    v4_result JSONB;
    cooccurrence_bonus NUMERIC := 0;
    cooccurrence_count INT := 0;
    cooccurrence_networks INT := 0;
BEGIN
    -- Get v4.0 individual score
    v4_result := app.calculate_threat_score_v4_individual(target_bssid);
    
    -- Calculate co-occurrence bonus
    SELECT 
        COUNT(*) AS network_count,
        SUM(cooccurrence_count) AS total_cooccurrences
    INTO cooccurrence_networks, cooccurrence_count
    FROM app.network_cooccurrence
    WHERE (bssid1 = target_bssid OR bssid2 = target_bssid)
    AND cooccurrence_count >= 10;
    
    -- Scoring: 5 points for 10+ co-occurrences, +1 per additional network (max 15)
    IF cooccurrence_count >= 10 THEN
        cooccurrence_bonus := LEAST(5 + cooccurrence_networks, 15);
    END IF;
    
    -- Build result
    result := jsonb_build_object(
        'model_version', '4.1-individual',
        'total_score', (v4_result->>'total_score')::numeric + cooccurrence_bonus,
        'components', jsonb_set(
            v4_result->'components',
            '{cooccurrence_bonus}',
            to_jsonb(cooccurrence_bonus)
        ),
        'cooccurrence_details', jsonb_build_object(
            'network_count', cooccurrence_networks,
            'total_cooccurrences', cooccurrence_count
        )
    );
    
    -- Recalculate threat level with new score
    result := jsonb_set(
        result,
        '{threat_level}',
        to_jsonb(
            CASE
                WHEN (result->>'total_score')::numeric >= 80 THEN 'CRITICAL'
                WHEN (result->>'total_score')::numeric >= 60 THEN 'HIGH'
                WHEN (result->>'total_score')::numeric >= 40 THEN 'MEDIUM'
                WHEN (result->>'total_score')::numeric >= 20 THEN 'LOW'
                ELSE 'NONE'
            END
        )
    );
    
    RETURN result;
END;
$$;

COMMENT ON FUNCTION app.calculate_threat_score_v4_1_individual IS 
'v4.1 individual scoring with co-occurrence detection (5-15 points for coordinated networks)';

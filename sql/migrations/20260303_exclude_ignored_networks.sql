-- Exclude Ignored Networks from Threat Scoring
-- Purpose: Set ignored networks to NONE and exclude from future scoring

-- Step 1: Mark all ignored networks as NONE
INSERT INTO app.network_threat_scores
    (bssid, rule_based_score, rule_based_flags, final_threat_score,
     final_threat_level, model_version, scored_at, updated_at)
SELECT
    nt.bssid,
    0,
    jsonb_build_object('ignored', true),
    0,
    'NONE',
    '4.0-ignored',
    NOW(),
    NOW()
FROM app.network_tags nt
WHERE COALESCE(nt.is_ignored, false) = true
ON CONFLICT (bssid) DO UPDATE SET
    rule_based_score = 0,
    rule_based_flags = jsonb_build_object('ignored', true),
    final_threat_score = 0,
    final_threat_level = 'NONE',
    model_version = '4.0-ignored',
    updated_at = NOW();

-- Step 2: Update cache to mark as scored (no rescoring needed)
INSERT INTO app.threat_scores_cache (bssid, threat_score, threat_level, computed_at, needs_recompute)
SELECT 
    nt.bssid,
    0,
    'NONE',
    NOW(),
    false
FROM app.network_tags nt
WHERE COALESCE(nt.is_ignored, false) = true
ON CONFLICT (bssid) DO UPDATE SET
    threat_score = 0,
    threat_level = 'NONE',
    computed_at = NOW(),
    needs_recompute = false;

-- Step 3: Create trigger to auto-ignore when tag is added
CREATE OR REPLACE FUNCTION app.auto_ignore_tagged_network()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF COALESCE(NEW.is_ignored, false) = true THEN
        -- Set score to NONE
        INSERT INTO app.network_threat_scores
            (bssid, rule_based_score, rule_based_flags, final_threat_score,
             final_threat_level, model_version, scored_at, updated_at)
        VALUES
            (NEW.bssid, 0, jsonb_build_object('ignored', true), 0, 'NONE', '4.0-ignored', NOW(), NOW())
        ON CONFLICT (bssid) DO UPDATE SET
            rule_based_score = 0,
            rule_based_flags = jsonb_build_object('ignored', true),
            final_threat_score = 0,
            final_threat_level = 'NONE',
            model_version = '4.0-ignored',
            updated_at = NOW();
        
        -- Update cache
        INSERT INTO app.threat_scores_cache (bssid, threat_score, threat_level, computed_at, needs_recompute)
        VALUES (NEW.bssid, 0, 'NONE', NOW(), false)
        ON CONFLICT (bssid) DO UPDATE SET
            threat_score = 0,
            threat_level = 'NONE',
            computed_at = NOW(),
            needs_recompute = false;
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_ignore ON app.network_tags;
CREATE TRIGGER trigger_auto_ignore
    AFTER INSERT OR UPDATE OF is_ignored ON app.network_tags
    FOR EACH ROW
    EXECUTE FUNCTION app.auto_ignore_tagged_network();

-- Step 4: Update incremental scoring to skip ignored networks
COMMENT ON FUNCTION app.auto_ignore_tagged_network IS 
'Automatically sets ignored networks to NONE threat level';

SELECT 'Ignore function installed' AS status;
SELECT COUNT(*) AS ignored_networks
FROM app.network_tags
WHERE COALESCE(is_ignored, false) = true;

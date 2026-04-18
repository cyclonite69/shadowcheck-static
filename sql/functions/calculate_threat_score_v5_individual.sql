-- Threat Scoring v5.0 - Individual Behavior Only (No Fleet Correlation)
-- Purpose: Fast per-network scoring without expensive cross-network queries
-- Fleet correlation bonus calculated separately in batch

CREATE OR REPLACE FUNCTION calculate_threat_score_v5_individual(p_bssid TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN (
        WITH observations AS (
            SELECT
                o.id,
                o.bssid,
                o.lat,
                o.lon,
                o.time,
                o.level AS signal,
                ST_SetSRID(ST_MakePoint(o.lon, o.lat), 4326) AS geom
            FROM app.observations o
            WHERE o.bssid = p_bssid
            AND o.lat IS NOT NULL
            AND o.lon IS NOT NULL
            AND (o.is_quality_filtered = false OR o.is_quality_filtered IS NULL)
            ORDER BY o.time ASC
            LIMIT 100
        ),
        home_location AS (
            SELECT
                latitude AS lat,
                longitude AS lon
            FROM app.location_markers
            WHERE marker_type = 'home'
            LIMIT 1
        ),
        network_metadata AS (
            SELECT
                n.bssid,
                n.ssid,
                n.type
            FROM app.networks n
            WHERE n.bssid = p_bssid
        ),

        -- Task 2: Follow-Leg Detection (up to 100)
        obs_sequence AS (
            SELECT
                o1.id AS id_current,
                o1.lat AS lat_current,
                o1.lon AS lon_current,
                o1.time AS time_current,
                o1.geom AS geom,
                LEAD(o1.id) OVER (ORDER BY o1.time) AS id_next,
                LEAD(o1.lat) OVER (ORDER BY o1.time) AS lat_next,
                LEAD(o1.lon) OVER (ORDER BY o1.time) AS lon_next,
                LEAD(o1.time) OVER (ORDER BY o1.time) AS time_next,
                LEAD(o1.geom) OVER (ORDER BY o1.time) AS geom_next
            FROM observations o1
        ),
        qualifying_legs AS (
            SELECT
                id_current,
                id_next,
                lat_current,
                lon_current,
                lat_next,
                lon_next,
                time_current,
                time_next,
                ST_Distance(geom::geography, geom_next::geography) AS distance_m,
                EXTRACT(EPOCH FROM (time_next - time_current)) / 60.0 AS time_diff_min
            FROM obs_sequence
            WHERE id_next IS NOT NULL
              AND geom IS NOT NULL
              AND geom_next IS NOT NULL
              AND ST_Distance(geom::geography, geom_next::geography) >= 500
        ),
        -- Linear Travel Gate: flag consecutive pairs consistent with drive-by movement
        linear_travel_thresholds AS (
            SELECT
                500::numeric  AS distance_threshold_m,
                5::numeric    AS speed_min_kmh,
                80::numeric   AS speed_max_kmh,
                0.2::numeric  AS linear_travel_weight
        ),
        linear_travel_pairs AS (
            SELECT
                os.id_current,
                os.time_current
            FROM obs_sequence os
            CROSS JOIN linear_travel_thresholds ltt
            WHERE os.id_next IS NOT NULL
              AND os.geom IS NOT NULL
              AND os.geom_next IS NOT NULL
              AND is_linear_travel_pair(
                    ST_Distance(os.geom::geography, os.geom_next::geography),
                    EXTRACT(EPOCH FROM (os.time_next - os.time_current)),
                    ltt.distance_threshold_m,
                    ltt.speed_min_kmh,
                    ltt.speed_max_kmh
                  )
        ),
        linear_travel_stats AS (
            SELECT COUNT(*)::integer AS excluded_count
            FROM linear_travel_pairs
        ),
        obs_gate_flag AS (
            SELECT DISTINCT id_current AS obs_id
            FROM linear_travel_pairs
        ),
        effective_daily_weights AS (
            SELECT
                DATE(o.time) AS obs_date,
                CASE
                    WHEN COUNT(*) = COUNT(ogf.obs_id) THEN ltt.linear_travel_weight
                    ELSE 1.0::numeric
                END AS day_weight
            FROM observations o
            CROSS JOIN linear_travel_thresholds ltt
            LEFT JOIN obs_gate_flag ogf ON ogf.obs_id = o.id
            GROUP BY DATE(o.time), ltt.linear_travel_weight
        ),
        leg_statistics AS (
            SELECT
                COUNT(*) AS leg_count,
                COUNT(CASE WHEN distance_m >= 50000 THEN 1 END) AS legs_50km_plus,
                COUNT(CASE WHEN distance_m >= 10000 AND distance_m < 50000 THEN 1 END) AS legs_10_50km,
                COUNT(CASE WHEN distance_m >= 2000 AND distance_m < 10000 THEN 1 END) AS legs_2_10km,
                COUNT(CASE WHEN distance_m >= 500 AND distance_m < 2000 THEN 1 END) AS legs_500_2km,
                COUNT(DISTINCT DATE(time_current)) AS distinct_days,
                MAX(DATE(time_next)) - MIN(DATE(time_current)) AS date_span_days,
                COUNT(CASE WHEN time_diff_min < 30 AND distance_m > 2000 THEN 1 END) AS fast_movement_legs,
                COUNT(CASE WHEN time_diff_min >= 30 AND time_diff_min <= 240 AND distance_m > 2000 THEN 1 END) AS moderate_movement_legs
            FROM qualifying_legs
        ),
        leg_count_score AS (
            SELECT
                CASE
                    WHEN ls.leg_count >= 4 THEN 70
                    WHEN ls.leg_count = 3 THEN 50
                    WHEN ls.leg_count = 2 THEN 30
                    WHEN ls.leg_count = 1 THEN 15
                    ELSE 0
                END::numeric AS score
            FROM leg_statistics ls
        ),
        distance_bonus AS (
            SELECT
                LEAST(25,
                    (ls.legs_50km_plus * 12) +
                    (ls.legs_10_50km * 7) +
                    (ls.legs_2_10km * 3)
                )::numeric AS bonus
            FROM leg_statistics ls
        ),
        temporal_spread_bonus AS (
            SELECT
                CASE
                    WHEN ls.distinct_days >= 30 THEN 40
                    WHEN ls.distinct_days >= 8 THEN 30
                    WHEN ls.distinct_days >= 4 THEN 20
                    WHEN ls.distinct_days >= 2 THEN 10
                    ELSE 0
                END::numeric AS bonus
            FROM leg_statistics ls
        ),
        velocity_bonus AS (
            SELECT
                LEAST(20,
                    (ls.fast_movement_legs * 8) +
                    (ls.moderate_movement_legs * 4)
                )::numeric AS bonus
            FROM leg_statistics ls
        ),
        -- WiGLE spread: bounding box diagonal, O(n) aggregate scan, gated at >= 5 obs
        wigle_spread AS (
            SELECT
                COUNT(*) AS obs_count,
                ST_Distance(
                    ST_SetSRID(ST_MakePoint(MIN(longitude), MIN(latitude)), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(MAX(longitude), MAX(latitude)), 4326)::geography
                ) / 1000.0 AS spread_km
            FROM app.wigle_v3_observations
            WHERE UPPER(netid) = UPPER(p_bssid)
        ),
        wigle_bonus AS (
            SELECT CASE
                WHEN ws.obs_count >= 5 AND ws.spread_km >= 0.5
                    THEN LEAST(10, ws.spread_km / 10.0)::numeric
                ELSE 0::numeric
            END AS bonus
            FROM wigle_spread ws
        ),
        follow_legs_score AS (
            SELECT
                LEAST(100,
                    COALESCE(lcs.score, 0) +
                    COALESCE(db.bonus, 0) +
                    COALESCE(tsb.bonus, 0) +
                    COALESCE(vb.bonus, 0) +
                    COALESCE(wb.bonus, 0)
                )::numeric AS score
            FROM leg_count_score lcs
            CROSS JOIN distance_bonus db
            CROSS JOIN temporal_spread_bonus tsb
            CROSS JOIN velocity_bonus vb
            CROSS JOIN wigle_bonus wb
        ),

        -- Task 3: Parked Surveillance Score — deferred (not yet enabled)
        parking_score AS (SELECT 0::numeric AS score),

        -- Task 4: Location Correlation Score — deferred (not yet enabled)
        correlation_score AS (SELECT 0::numeric AS score),

        -- Task 5: Equipment Profile Score (10%)
        manufacturer_lookup AS (
            SELECT
                rm.manufacturer AS manufacturer
            FROM network_metadata nm
            LEFT JOIN app.radio_manufacturers rm
                ON rm.prefix = UPPER(REPLACE(SUBSTRING(nm.bssid, 1, 8), ':', ''))
        ),
        equipment_score AS (
            SELECT
                (
                    CASE
                        WHEN ml.manufacturer ILIKE '%AirLink%'
                          OR ml.manufacturer ILIKE '%Cradlepoint%'
                          OR ml.manufacturer ILIKE '%Sierra Wireless%'
                          OR ml.manufacturer ILIKE '%Mitsumi%'
                          OR ml.manufacturer ILIKE '%Alps Alpine%'
                          OR ml.manufacturer ILIKE '%AlpsAlpine%'
                          OR ml.manufacturer ILIKE '%Magneti Marelli Sistemas%' THEN 5
                        ELSE 0
                    END +
                    CASE
                        WHEN nm.ssid ~ '^PAS-\d+$' THEN 3
                        WHEN nm.ssid = 'mdt' THEN 3
                        WHEN nm.ssid ~ '^\d+$' THEN 2
                        WHEN nm.ssid ~* '(myChevrolet|myBuick|myGMC|MBUX|CADILLAC)' THEN 2
                        ELSE 0
                    END
                )::numeric AS score
            FROM network_metadata nm
            CROSS JOIN manufacturer_lookup ml
        ),

        -- Task 6: Temporal Persistence Score (5%) — drive-by-only days downweighted to 0.2
        temporal_score AS (
            SELECT
                LEAST(5,
                    (SUM(edw.day_weight)::numeric / 100.0) * 5
                )::numeric AS score
            FROM effective_daily_weights edw
        ),

        -- Cellular exclusion: L/N/G are fixed infrastructure, not mobile surveillance
        cellular_multiplier AS (
            SELECT CASE
                WHEN nm.type IN ('L', 'N', 'G') THEN 0::numeric
                ELSE 1::numeric
            END AS multiplier
            FROM network_metadata nm
        ),

        -- BT/BLE signal modifier: sentinel-safe avg using FILTER (WHERE level < 0)
        bt_ble_modifier AS (
            SELECT CASE
                WHEN nm.type NOT IN ('B', 'E') THEN 1.0::numeric
                WHEN COUNT(o.signal) FILTER (WHERE o.signal < 0) = 0 THEN 1.0::numeric
                WHEN AVG(o.signal) FILTER (WHERE o.signal < 0) > -50 THEN 0.0::numeric
                WHEN AVG(o.signal) FILTER (WHERE o.signal < 0) > -65 THEN 0.4::numeric
                WHEN AVG(o.signal) FILTER (WHERE o.signal < 0) > -80 THEN 0.8::numeric
                ELSE 1.0::numeric
            END AS multiplier
            FROM observations o
            CROSS JOIN network_metadata nm
            GROUP BY nm.type
        )

        -- Return complete structure with all scores (no fleet bonus)
        SELECT jsonb_build_object(
            'bssid', p_bssid,
            'total_score', cm.multiplier * (
                COALESCE(fls.score, 0) * bm.multiplier +
                COALESCE(ps.score, 0) +
                COALESCE(cs.score, 0) +
                COALESCE(es.score, 0) +
                COALESCE(ts.score, 0)
            ),
            'threat_level',
                CASE
                    WHEN cm.multiplier * (COALESCE(fls.score, 0) * bm.multiplier + COALESCE(ps.score, 0) + COALESCE(cs.score, 0) + COALESCE(es.score, 0) + COALESCE(ts.score, 0)) >= 81 THEN 'CRITICAL'
                    WHEN cm.multiplier * (COALESCE(fls.score, 0) * bm.multiplier + COALESCE(ps.score, 0) + COALESCE(cs.score, 0) + COALESCE(es.score, 0) + COALESCE(ts.score, 0)) >= 61 THEN 'HIGH'
                    WHEN cm.multiplier * (COALESCE(fls.score, 0) * bm.multiplier + COALESCE(ps.score, 0) + COALESCE(cs.score, 0) + COALESCE(es.score, 0) + COALESCE(ts.score, 0)) >= 41 THEN 'MEDIUM'
                    WHEN cm.multiplier * (COALESCE(fls.score, 0) * bm.multiplier + COALESCE(ps.score, 0) + COALESCE(cs.score, 0) + COALESCE(es.score, 0) + COALESCE(ts.score, 0)) >= 21 THEN 'LOW'
                    ELSE 'NONE'
                END,
            'model_version', '5.2',
            'linear_travel_excluded_count', lts.excluded_count,
            'components', jsonb_build_object(
                'follow_legs', COALESCE(fls.score, 0) * bm.multiplier * cm.multiplier,
                'parked_surveillance', COALESCE(ps.score, 0) * cm.multiplier,
                'location_correlation', COALESCE(cs.score, 0) * cm.multiplier,
                'equipment_profile', COALESCE(es.score, 0) * cm.multiplier,
                'temporal_persistence', COALESCE(ts.score, 0) * cm.multiplier,
                'bt_ble_signal_multiplier', bm.multiplier,
                'cellular_multiplier', cm.multiplier
            )
        )
        FROM follow_legs_score fls
        CROSS JOIN parking_score ps
        CROSS JOIN correlation_score cs
        CROSS JOIN equipment_score es
        CROSS JOIN temporal_score ts
        CROSS JOIN linear_travel_stats lts
        CROSS JOIN cellular_multiplier cm
        CROSS JOIN bt_ble_modifier bm
    );
END;
$$;

COMMENT ON FUNCTION calculate_threat_score_v5_individual(TEXT) IS
'Threat Scoring v5.2 Individual - Linear travel gate: drive-by-only days downweighted (0.2) in temporal_score; is_linear_travel_pair() shared helper';

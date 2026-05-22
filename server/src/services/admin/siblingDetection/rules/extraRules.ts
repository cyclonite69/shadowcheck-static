import { FLEET_SSID_SQL_LIST } from '../../siblingDetectionConstants';

type SiblingExtraRuleDefinition = {
  name: string;
  logKey: string;
  query: string;
  includeRunId?: boolean;
};

const EXTRA_RULE_UPPER_ROTATION = `
  WITH inserted AS (
    INSERT INTO app.network_sibling_pairs (
      bssid1, bssid2, rule, confidence, distance_m, matched_octets, pair_strength, quality_scope, computed_at,
      run_id
    )
    SELECT
      LEAST(a.bssid, b.bssid),
      GREATEST(a.bssid, b.bssid),
      'upper_octet_rotation',
      LEAST(1.000, 0.95),
      CASE
        WHEN COALESCE(a.bestlat, a.lastlat) IS NOT NULL
          AND COALESCE(a.bestlon, a.lastlon) IS NOT NULL
          AND COALESCE(b.bestlat, b.lastlat) IS NOT NULL
          AND COALESCE(b.bestlon, b.bestlon) IS NOT NULL
        THEN ST_Distance(
          ST_SetSRID(ST_MakePoint(COALESCE(a.bestlon, a.lastlon), COALESCE(a.bestlat, a.lastlat)), 4326)::geography,
          ST_SetSRID(ST_MakePoint(COALESCE(b.bestlon, b.lastlon), COALESCE(b.bestlat, b.lastlat)), 4326)::geography
        )
        ELSE NULL
      END,
      'o2-o5',
      'candidate',
      'default',
      now(),
      $1::integer
    FROM app.networks a
    JOIN app.networks b
      ON SUBSTRING(b.bssid, 7) = SUBSTRING(a.bssid, 7)
     AND SUBSTRING(b.bssid, 1, 5) <> SUBSTRING(a.bssid, 1, 5)
     AND b.bssid > a.bssid
     AND b.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
    LEFT JOIN app.network_sibling_overrides nso
      ON nso.bssid1 = LEAST(a.bssid, b.bssid)
     AND nso.bssid2 = GREATEST(a.bssid, b.bssid)
     AND nso.relation = 'not_sibling'
     AND nso.is_active = true
    WHERE a.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
      AND nso.bssid1 IS NULL
    ON CONFLICT (bssid1, bssid2) DO UPDATE
      SET rule        = EXCLUDED.rule,
          confidence  = EXCLUDED.confidence,
          distance_m  = EXCLUDED.distance_m,
          matched_octets = EXCLUDED.matched_octets,
          pair_strength = EXCLUDED.pair_strength,
          quality_scope = EXCLUDED.quality_scope,
          computed_at = EXCLUDED.computed_at,
          run_id = EXCLUDED.run_id
      WHERE EXCLUDED.confidence > network_sibling_pairs.confidence
    RETURNING 1
  )
  SELECT COUNT(*)::int AS count FROM inserted
`;

const EXTRA_RULE_SSID_ANCHOR = `
  WITH inserted AS (
    INSERT INTO app.network_sibling_pairs (
      bssid1, bssid2, rule, confidence, ssid1, ssid2, distance_m, matched_octets, pair_strength, quality_scope, computed_at,
      run_id
    )
    SELECT
      LEAST(a.bssid, b.bssid),
      GREATEST(a.bssid, b.bssid),
      'ssid_anchor',
      LEAST(1.000, 0.97),
      a.ssid,
      b.ssid,
      ST_Distance(
        ST_SetSRID(ST_MakePoint(COALESCE(a.bestlon, a.lastlon), COALESCE(a.bestlat, a.lastlat)), 4326)::geography,
        ST_SetSRID(ST_MakePoint(COALESCE(b.bestlon, b.lastlon), COALESCE(b.bestlat, b.lastlat)), 4326)::geography
      ),
      'o1-o4+ssid',
      'candidate',
      'default',
      now(),
      $1::integer
    FROM app.networks a
    JOIN app.networks b
       ON b.ssid = a.ssid
     AND SUBSTRING(b.bssid, 1, 11) = SUBSTRING(a.bssid, 1, 11)
     AND b.bssid > a.bssid
     AND b.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
    LEFT JOIN app.network_sibling_overrides nso
      ON nso.bssid1 = LEAST(a.bssid, b.bssid)
     AND nso.bssid2 = GREATEST(a.bssid, b.bssid)
     AND nso.relation = 'not_sibling'
     AND nso.is_active = true
    WHERE a.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
      AND nso.bssid1 IS NULL
      AND a.ssid IS NOT NULL AND a.ssid <> ''
      AND lower(regexp_replace(a.ssid, '[^a-zA-Z0-9]+', '', 'g')) NOT IN (${FLEET_SSID_SQL_LIST})
      AND lower(regexp_replace(a.ssid, '[^a-zA-Z0-9]+', '', 'g')) NOT LIKE 'hmc%'
    LIMIT 50000
    ON CONFLICT (bssid1, bssid2) DO UPDATE
      SET rule        = EXCLUDED.rule,
          confidence  = EXCLUDED.confidence,
          ssid1       = EXCLUDED.ssid1,
          ssid2       = EXCLUDED.ssid2,
          distance_m  = EXCLUDED.distance_m,
          matched_octets = EXCLUDED.matched_octets,
          pair_strength = EXCLUDED.pair_strength,
          quality_scope = EXCLUDED.quality_scope,
          computed_at = EXCLUDED.computed_at,
          run_id = EXCLUDED.run_id
      WHERE EXCLUDED.confidence > network_sibling_pairs.confidence
    RETURNING 1
  )
  SELECT COUNT(*)::int AS count FROM inserted
`;

const EXTRA_RULE_CROSS_OUI_SSID = `
  WITH candidate_nodes AS (
    -- Criteria 1: Join on api_network_explorer_mv and enforce observation floor >= 5
    SELECT
      mv.bssid,
      mv.ssid,
      SUBSTRING(mv.bssid, 1, 8) AS OUI,
      mv.lat,
      mv.lon
    FROM app.api_network_explorer_mv mv
    WHERE mv.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
      AND mv.type = 'W'
      AND mv.observations >= 5
  ),
  cluster_sizes AS (
    -- Criteria 3: Calculate node count per OUI + SSID cluster
    SELECT
      OUI,
      ssid,
      COUNT(DISTINCT bssid) AS node_count
    FROM candidate_nodes
    GROUP BY OUI, ssid
  ),
  inserted AS (
    INSERT INTO app.network_sibling_pairs (
      bssid1, bssid2, rule, confidence, ssid1, ssid2, distance_m, matched_octets, pair_strength, quality_scope, computed_at,
      run_id
    )
    SELECT
      LEAST(a.bssid, b.bssid) AS bssid1,
      GREATEST(a.bssid, b.bssid) AS bssid2,
      'cross_oui_ssid_exact',
      LEAST(1.000, 0.88),
      a.ssid,
      b.ssid,
      CASE
        WHEN a.lat IS NOT NULL AND a.lon IS NOT NULL AND b.lat IS NOT NULL AND b.lon IS NOT NULL
        THEN ST_Distance(
          ST_SetSRID(ST_MakePoint(a.lon, a.lat), 4326)::geography,
          ST_SetSRID(ST_MakePoint(b.lon, b.lat), 4326)::geography
        )
        ELSE NULL
      END AS distance_m,
      '3+ matching octets'::text AS matched_octets,
      'candidate'::text AS pair_strength,
      'default'::text AS quality_scope,
      now() AS computed_at,
      $1::integer AS run_id
    FROM candidate_nodes a
    JOIN candidate_nodes b
      ON b.ssid = a.ssid
     AND SUBSTRING(b.bssid, 1, 8) <> SUBSTRING(a.bssid, 1, 8)
     AND b.bssid > a.bssid
    JOIN cluster_sizes cs_a ON cs_a.OUI = SUBSTRING(a.bssid, 1, 8) AND cs_a.ssid = a.ssid
    JOIN cluster_sizes cs_b ON cs_b.OUI = SUBSTRING(b.bssid, 1, 8) AND cs_b.ssid = b.ssid
    LEFT JOIN app.network_sibling_overrides nso
      ON nso.bssid1 = LEAST(a.bssid, b.bssid)
     AND nso.bssid2 = GREATEST(a.bssid, b.bssid)
     AND nso.relation = 'not_sibling'
     AND nso.is_active = true
    WHERE nso.bssid1 IS NULL
      AND a.ssid IS NOT NULL AND a.ssid <> ''
      AND lower(regexp_replace(a.ssid, '[^a-zA-Z0-9]+', '', 'g')) NOT IN (${FLEET_SSID_SQL_LIST})
      AND lower(regexp_replace(a.ssid, '[^a-zA-Z0-9]+', '', 'g')) NOT LIKE 'hmc%'
      -- Criteria 2: Share a minimum of 3 matching octets overall
      AND (
        (CASE WHEN split_part(b.bssid, ':', 1) = split_part(a.bssid, ':', 1) THEN 1 ELSE 0 END) +
        (CASE WHEN split_part(b.bssid, ':', 2) = split_part(a.bssid, ':', 2) THEN 1 ELSE 0 END) +
        (CASE WHEN split_part(b.bssid, ':', 3) = split_part(a.bssid, ':', 3) THEN 1 ELSE 0 END) +
        (CASE WHEN split_part(b.bssid, ':', 4) = split_part(a.bssid, ':', 4) THEN 1 ELSE 0 END) +
        (CASE WHEN split_part(b.bssid, ':', 5) = split_part(a.bssid, ':', 5) THEN 1 ELSE 0 END) +
        (CASE WHEN split_part(b.bssid, ':', 6) = split_part(a.bssid, ':', 6) THEN 1 ELSE 0 END)
      ) >= 3
      -- Criteria 3: Keep cluster sizes <= 16
      AND cs_a.node_count <= 16
      AND cs_b.node_count <= 16
    ON CONFLICT (bssid1, bssid2) DO UPDATE
      SET rule        = EXCLUDED.rule,
          confidence  = EXCLUDED.confidence,
          ssid1       = EXCLUDED.ssid1,
          ssid2       = EXCLUDED.ssid2,
          distance_m  = EXCLUDED.distance_m,
          matched_octets = EXCLUDED.matched_octets,
          pair_strength = EXCLUDED.pair_strength,
          quality_scope = EXCLUDED.quality_scope,
          computed_at = EXCLUDED.computed_at,
          run_id = EXCLUDED.run_id
      WHERE EXCLUDED.confidence > network_sibling_pairs.confidence
    RETURNING 1
  )
  SELECT COUNT(*)::int AS count FROM inserted
`;

const EXTRA_RULE_SAME_OUI_PROXIMITY = `
  WITH inserted AS (
    INSERT INTO app.network_sibling_pairs (
      bssid1, bssid2, rule, confidence, distance_m, matched_octets, pair_strength, quality_scope, computed_at,
      run_id
    )
    SELECT
      LEAST(a.bssid, b.bssid),
      GREATEST(a.bssid, b.bssid),
      'same_oui_proximity',
      LEAST(1.000, 0.93),
      CASE
        WHEN COALESCE(a.bestlat, a.lastlat) IS NOT NULL
          AND COALESCE(a.bestlon, a.lastlon) IS NOT NULL
          AND COALESCE(b.bestlat, b.lastlat) IS NOT NULL
          AND COALESCE(b.bestlon, b.lastlon) IS NOT NULL
        THEN ST_Distance(
          ST_SetSRID(ST_MakePoint(COALESCE(a.bestlon, a.lastlon), COALESCE(a.bestlat, a.lastlat)), 4326)::geography,
          ST_SetSRID(ST_MakePoint(COALESCE(b.bestlon, b.lastlon), COALESCE(b.bestlat, b.lastlat)), 4326)::geography
        )
        ELSE NULL
      END,
      'o1-o4',
      'candidate',
      'default',
      now(),
      $1::integer
    FROM app.networks a
    JOIN app.networks b
      ON b.bssid > a.bssid
     AND b.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
     AND (
       (CASE WHEN split_part(b.bssid, ':', 1) = split_part(a.bssid, ':', 1) THEN 1 ELSE 0 END) +
       (CASE WHEN split_part(b.bssid, ':', 2) = split_part(a.bssid, ':', 2) THEN 1 ELSE 0 END) +
       (CASE WHEN split_part(b.bssid, ':', 3) = split_part(a.bssid, ':', 3) THEN 1 ELSE 0 END) +
       (CASE WHEN split_part(b.bssid, ':', 4) = split_part(a.bssid, ':', 4) THEN 1 ELSE 0 END) +
       (CASE WHEN split_part(b.bssid, ':', 5) = split_part(a.bssid, ':', 5) THEN 1 ELSE 0 END) +
       (CASE WHEN split_part(b.bssid, ':', 6) = split_part(a.bssid, ':', 6) THEN 1 ELSE 0 END)
     ) >= 5
    LEFT JOIN app.network_sibling_overrides nso
      ON nso.bssid1 = LEAST(a.bssid, b.bssid)
     AND nso.bssid2 = GREATEST(a.bssid, b.bssid)
     AND nso.relation = 'not_sibling'
     AND nso.is_active = true
    WHERE a.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
      AND nso.bssid1 IS NULL
      AND (a.ssid IS NOT NULL AND a.ssid != '' OR b.ssid IS NOT NULL AND b.ssid != '')
    ON CONFLICT (bssid1, bssid2) DO UPDATE
      SET rule        = EXCLUDED.rule,
          confidence  = EXCLUDED.confidence,
          distance_m  = EXCLUDED.distance_m,
          matched_octets = EXCLUDED.matched_octets,
          pair_strength = EXCLUDED.pair_strength,
          quality_scope = EXCLUDED.quality_scope,
          computed_at = EXCLUDED.computed_at,
          run_id = EXCLUDED.run_id
      WHERE EXCLUDED.confidence > network_sibling_pairs.confidence
    RETURNING 1
  )
  SELECT COUNT(*)::int AS count FROM inserted
`;

const EXTRA_RULE_OCTET4_ROTATION_64 = `
  WITH inserted AS (
    INSERT INTO app.network_sibling_pairs (
      bssid1, bssid2, rule, confidence, distance_m, matched_octets, pair_strength, quality_scope, computed_at,
      run_id
    )
    SELECT
      LEAST(a.bssid, b.bssid),
      GREATEST(a.bssid, b.bssid),
      'octet4_rotation_64',
      LEAST(1.000, 0.92),
      ST_Distance(
        ST_SetSRID(ST_MakePoint(COALESCE(a.bestlon, a.lastlon), COALESCE(a.bestlat, a.lastlat)), 4326)::geography,
        ST_SetSRID(ST_MakePoint(COALESCE(b.bestlon, b.lastlon), COALESCE(b.bestlat, b.lastlat)), 4326)::geography
      ),
      'o1-o3+o5-o6',
      'candidate',
      'default',
      now(),
      $1::integer
    FROM app.networks a
    JOIN app.networks b
      ON SUBSTRING(b.bssid, 1, 8) = SUBSTRING(a.bssid, 1, 8)
     AND ABS(
           ('x' || SUBSTRING(b.bssid, 10, 2))::bit(8)::int -
           ('x' || SUBSTRING(a.bssid, 10, 2))::bit(8)::int
         ) = 64
     AND SUBSTRING(b.bssid, 13) = SUBSTRING(a.bssid, 13)
     AND b.bssid > a.bssid
     AND b.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
    LEFT JOIN app.network_sibling_overrides nso
      ON nso.bssid1 = LEAST(a.bssid, b.bssid)
     AND nso.bssid2 = GREATEST(a.bssid, b.bssid)
     AND nso.relation = 'not_sibling'
     AND nso.is_active = true
    WHERE a.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
      AND nso.bssid1 IS NULL
    ON CONFLICT (bssid1, bssid2) DO UPDATE
      SET rule        = EXCLUDED.rule,
          confidence  = EXCLUDED.confidence,
          distance_m  = EXCLUDED.distance_m,
          matched_octets = EXCLUDED.matched_octets,
          pair_strength = EXCLUDED.pair_strength,
          quality_scope = EXCLUDED.quality_scope,
          computed_at = EXCLUDED.computed_at,
          run_id = EXCLUDED.run_id
      WHERE EXCLUDED.confidence > network_sibling_pairs.confidence
    RETURNING 1
  )
  SELECT COUNT(*)::int AS count FROM inserted
`;

const EXTRA_RULE_CISCO_QUAD_RADIO = `
  WITH candidates AS (
    SELECT
      n.bssid,
      SUBSTRING(n.bssid, 1, 14) AS prefix5,
      ('x' || SUBSTRING(n.bssid, 16, 2))::bit(8)::int AS last_octet,
      COALESCE(n.bestlat, n.lastlat) AS lat,
      COALESCE(n.bestlon, n.lastlon) AS lon
    FROM app.networks n
    WHERE n.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
  ),
  quad_bases AS (
    SELECT DISTINCT c.prefix5, c.last_octet AS base_n
    FROM candidates c
    JOIN candidates c1 ON c1.prefix5 = c.prefix5 AND c1.last_octet = c.last_octet + 1
    JOIN candidates c4 ON c4.prefix5 = c.prefix5 AND c4.last_octet = c.last_octet + 4
    JOIN candidates c5 ON c5.prefix5 = c.prefix5 AND c5.last_octet = c.last_octet + 5
  ),
  quad_members AS (
    SELECT q.prefix5, q.base_n, c.bssid, c.lat, c.lon
    FROM quad_bases q
    JOIN candidates c ON c.prefix5 = q.prefix5
      AND c.last_octet IN (q.base_n, q.base_n + 1, q.base_n + 4, q.base_n + 5)
  ),
  inserted AS (
    INSERT INTO app.network_sibling_pairs (
      bssid1, bssid2, rule, confidence, distance_m, matched_octets, pair_strength, quality_scope, computed_at,
      run_id
    )
    SELECT
      LEAST(a.bssid, b.bssid),
      GREATEST(a.bssid, b.bssid),
      'cisco_quad_radio',
      LEAST(1.000, 0.93),
      ST_Distance(
        ST_SetSRID(ST_MakePoint(a.lon, a.lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(b.lon, b.lat), 4326)::geography
      ),
      'o1-o5+quad',
      'candidate',
      'default',
      now(),
      $1::integer
    FROM quad_members a
    JOIN quad_members b
      ON a.prefix5 = b.prefix5
     AND a.base_n = b.base_n
     AND b.bssid > a.bssid
    LEFT JOIN app.network_sibling_overrides nso
      ON nso.bssid1 = LEAST(a.bssid, b.bssid)
     AND nso.bssid2 = GREATEST(a.bssid, b.bssid)
     AND nso.relation = 'not_sibling'
     AND nso.is_active = true
    WHERE nso.bssid1 IS NULL
    ON CONFLICT (bssid1, bssid2) DO UPDATE
      SET rule        = EXCLUDED.rule,
          confidence  = EXCLUDED.confidence,
          distance_m  = EXCLUDED.distance_m,
          matched_octets = EXCLUDED.matched_octets,
          pair_strength = EXCLUDED.pair_strength,
          quality_scope = EXCLUDED.quality_scope,
          computed_at = EXCLUDED.computed_at,
          run_id = EXCLUDED.run_id
      WHERE EXCLUDED.confidence > network_sibling_pairs.confidence
    RETURNING 1
  )
  SELECT COUNT(*)::int AS count FROM inserted
`;

const EXTRA_RULE_GENESEE_COUNTY = `
  WITH inserted AS (
    INSERT INTO app.network_sibling_pairs (
      bssid1, bssid2, rule, confidence, distance_m, matched_octets, pair_strength, quality_scope, computed_at,
      run_id
    )
    SELECT
      LEAST(a.bssid, b.bssid),
      GREATEST(a.bssid, b.bssid),
      'genesee_county_wide_sequential',
      LEAST(1.000, 0.95),
      ST_Distance(
        ST_SetSRID(ST_MakePoint(COALESCE(a.bestlon, a.lastlon), COALESCE(a.bestlat, a.lastlat)), 4326)::geography,
        ST_SetSRID(ST_MakePoint(COALESCE(b.bestlon, b.lastlon), COALESCE(b.bestlat, b.lastlat)), 4326)::geography
      ),
      'o1-o5',
      'candidate',
      'default',
      now(),
      $1::integer
    FROM app.networks a
    JOIN app.networks b
      ON b.bssid > a.bssid
     AND b.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
     AND (
       (CASE WHEN split_part(b.bssid, ':', 1) = split_part(a.bssid, ':', 1) THEN 1 ELSE 0 END) +
       (CASE WHEN split_part(b.bssid, ':', 2) = split_part(a.bssid, ':', 2) THEN 1 ELSE 0 END) +
       (CASE WHEN split_part(b.bssid, ':', 3) = split_part(a.bssid, ':', 3) THEN 1 ELSE 0 END) +
       (CASE WHEN split_part(b.bssid, ':', 4) = split_part(a.bssid, ':', 4) THEN 1 ELSE 0 END) +
       (CASE WHEN split_part(b.bssid, ':', 5) = split_part(a.bssid, ':', 5) THEN 1 ELSE 0 END) +
       (CASE WHEN split_part(b.bssid, ':', 6) = split_part(a.bssid, ':', 6) THEN 1 ELSE 0 END)
     ) >= 5
    LEFT JOIN app.network_sibling_overrides nso
      ON nso.bssid1 = LEAST(a.bssid, b.bssid)
     AND nso.bssid2 = GREATEST(a.bssid, b.bssid)
     AND nso.relation = 'not_sibling'
     AND nso.is_active = true
    WHERE a.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
      AND SUBSTRING(a.bssid, 1, 8) IN ('24:D7:9C', 'C8:28:E5')
      AND nso.bssid1 IS NULL
    ON CONFLICT (bssid1, bssid2) DO UPDATE
      SET rule        = EXCLUDED.rule,
          confidence  = EXCLUDED.confidence,
          distance_m  = EXCLUDED.distance_m,
          matched_octets = EXCLUDED.matched_octets,
          pair_strength = EXCLUDED.pair_strength,
          quality_scope = EXCLUDED.quality_scope,
          computed_at = EXCLUDED.computed_at,
          run_id = EXCLUDED.run_id
      WHERE EXCLUDED.confidence > network_sibling_pairs.confidence
    RETURNING 1
  )
  SELECT COUNT(*)::int AS count FROM inserted
`;

const EXTRA_RULE_TARGET_RETAIL = `
  WITH inserted AS (
    INSERT INTO app.network_sibling_pairs (
      bssid1, bssid2, rule, confidence, distance_m, matched_octets, pair_strength, quality_scope, computed_at,
      run_id
    )
    SELECT
      LEAST(a.bssid, b.bssid),
      GREATEST(a.bssid, b.bssid),
      'target_retail_sequential',
      LEAST(1.000, 0.93),
      ST_Distance(
        ST_SetSRID(ST_MakePoint(COALESCE(a.bestlon, a.lastlon), COALESCE(a.bestlat, a.lastlat)), 4326)::geography,
        ST_SetSRID(ST_MakePoint(COALESCE(b.bestlon, b.lastlon), COALESCE(b.bestlat, b.lastlat)), 4326)::geography
      ),
      'o1-o5',
      'candidate',
      'default',
      now(),
      $1::integer
    FROM app.networks a
    JOIN app.networks b
      ON SUBSTRING(b.bssid, 1, 14) = SUBSTRING(a.bssid, 1, 14)
     AND ABS(
           ('x' || SUBSTRING(b.bssid, 16, 2))::bit(8)::int -
           ('x' || SUBSTRING(a.bssid, 16, 2))::bit(8)::int
         ) BETWEEN 1 AND 5
     AND b.bssid > a.bssid
     AND b.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
    LEFT JOIN app.network_sibling_overrides nso
      ON nso.bssid1 = LEAST(a.bssid, b.bssid)
     AND nso.bssid2 = GREATEST(a.bssid, b.bssid)
     AND nso.relation = 'not_sibling'
     AND nso.is_active = true
    WHERE a.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
      AND SUBSTRING(a.bssid, 1, 8) = '54:A2:74'
      AND nso.bssid1 IS NULL
    ON CONFLICT (bssid1, bssid2) DO UPDATE
      SET rule        = EXCLUDED.rule,
          confidence  = EXCLUDED.confidence,
          distance_m  = EXCLUDED.distance_m,
          matched_octets = EXCLUDED.matched_octets,
          pair_strength = EXCLUDED.pair_strength,
          quality_scope = EXCLUDED.quality_scope,
          computed_at = EXCLUDED.computed_at,
          run_id = EXCLUDED.run_id
      WHERE EXCLUDED.confidence > network_sibling_pairs.confidence
    RETURNING 1
  )
  SELECT COUNT(*)::int AS count FROM inserted
`;

const EXTRA_RULE_RGLIDE_WIDE = `
  WITH inserted AS (
    INSERT INTO app.network_sibling_pairs (
      bssid1, bssid2, rule, confidence, distance_m, matched_octets, pair_strength, quality_scope, computed_at,
      run_id
    )
    SELECT
      LEAST(a.bssid, b.bssid),
      GREATEST(a.bssid, b.bssid),
      'rglide_wide_sequential',
      LEAST(1.000, 0.88),
      ST_Distance(
        ST_SetSRID(ST_MakePoint(COALESCE(a.bestlon, a.lastlon), COALESCE(a.bestlat, a.lastlat)), 4326)::geography,
        ST_SetSRID(ST_MakePoint(COALESCE(b.bestlon, b.lastlon), COALESCE(b.bestlat, b.lastlat)), 4326)::geography
      ),
      'o1-o5',
      'candidate',
      'default',
      now(),
      $1::integer
    FROM app.networks a
    JOIN app.networks b
      ON b.bssid > a.bssid
     AND b.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
     AND (
       (CASE WHEN split_part(b.bssid, ':', 1) = split_part(a.bssid, ':', 1) THEN 1 ELSE 0 END) +
       (CASE WHEN split_part(b.bssid, ':', 2) = split_part(a.bssid, ':', 2) THEN 1 ELSE 0 END) +
       (CASE WHEN split_part(b.bssid, ':', 3) = split_part(a.bssid, ':', 3) THEN 1 ELSE 0 END) +
       (CASE WHEN split_part(b.bssid, ':', 4) = split_part(a.bssid, ':', 4) THEN 1 ELSE 0 END) +
       (CASE WHEN split_part(b.bssid, ':', 5) = split_part(a.bssid, ':', 5) THEN 1 ELSE 0 END) +
       (CASE WHEN split_part(b.bssid, ':', 6) = split_part(a.bssid, ':', 6) THEN 1 ELSE 0 END)
     ) >= 5
    LEFT JOIN app.network_sibling_overrides nso
      ON nso.bssid1 = LEAST(a.bssid, b.bssid)
     AND nso.bssid2 = GREATEST(a.bssid, b.bssid)
     AND nso.relation = 'not_sibling'
     AND nso.is_active = true
    WHERE a.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
      AND SUBSTRING(a.bssid, 1, 8) = '30:57:8E'
      AND nso.bssid1 IS NULL
    ON CONFLICT (bssid1, bssid2) DO UPDATE
      SET rule        = EXCLUDED.rule,
          confidence  = EXCLUDED.confidence,
          distance_m  = EXCLUDED.distance_m,
          matched_octets = EXCLUDED.matched_octets,
          pair_strength = EXCLUDED.pair_strength,
          quality_scope = EXCLUDED.quality_scope,
          computed_at = EXCLUDED.computed_at,
          run_id = EXCLUDED.run_id
      WHERE EXCLUDED.confidence > network_sibling_pairs.confidence
    RETURNING 1
  )
  SELECT COUNT(*)::int AS count FROM inserted
`;

const EXTRA_RULE_MANUAL_BOOST = `
  WITH updated AS (
    UPDATE app.network_sibling_pairs p
    SET rule        = 'manual_confirmed',
        confidence  = 1.0,
        pair_strength = 'verified',
        quality_scope = 'manual',
        computed_at = now()
    FROM app.network_sibling_overrides o
    WHERE o.bssid1 = p.bssid1
      AND o.bssid2 = p.bssid2
      AND o.relation = 'sibling'
      AND o.is_active = true
      AND p.confidence < 1.0
    RETURNING 1
  )
  SELECT COUNT(*)::int AS count FROM updated
`;

const EXTRA_RULE_MANUAL_INSERT = `
  WITH inserted AS (
    INSERT INTO app.network_sibling_pairs (
      bssid1, bssid2, rule, confidence, quality_scope, computed_at
    )
    SELECT
      o.bssid1,
      o.bssid2,
      'manual_confirmed',
      1.0,
      'manual',
      now()
    FROM app.network_sibling_overrides o
    WHERE o.relation = 'sibling'
      AND o.is_active = true
    ON CONFLICT (bssid1, bssid2) DO UPDATE
      SET rule        = 'manual_confirmed',
          confidence  = 1.0,
          quality_scope = 'manual',
          computed_at = now()
      WHERE network_sibling_pairs.confidence < 1.0
    RETURNING 1
  )
  SELECT COUNT(*)::int AS count FROM inserted
`;

const EXTRA_SIBLING_RULES: SiblingExtraRuleDefinition[] = [
  {
    name: 'upper_rotation',
    logKey: 'upper_rotation',
    query: EXTRA_RULE_UPPER_ROTATION,
    includeRunId: true,
  },
  { name: 'ssid_anchor', logKey: 'ssid_anchor', query: EXTRA_RULE_SSID_ANCHOR, includeRunId: true },
  { name: 'cross_oui', logKey: 'cross_oui', query: EXTRA_RULE_CROSS_OUI_SSID, includeRunId: true },
  {
    name: 'same_oui_proximity',
    logKey: 'same_oui_proximity',
    query: EXTRA_RULE_SAME_OUI_PROXIMITY,
    includeRunId: true,
  },
  {
    name: 'octet4_rotation_64',
    logKey: 'octet4_rotation_64',
    query: EXTRA_RULE_OCTET4_ROTATION_64,
    includeRunId: true,
  },
  {
    name: 'cisco_quad_radio',
    logKey: 'cisco_quad_radio',
    query: EXTRA_RULE_CISCO_QUAD_RADIO,
    includeRunId: true,
  },
  {
    name: 'genesee_county',
    logKey: 'genesee_county',
    query: EXTRA_RULE_GENESEE_COUNTY,
    includeRunId: true,
  },
  {
    name: 'target_retail',
    logKey: 'target_retail',
    query: EXTRA_RULE_TARGET_RETAIL,
    includeRunId: true,
  },
  { name: 'rglide_wide', logKey: 'rglide_wide', query: EXTRA_RULE_RGLIDE_WIDE, includeRunId: true },
  { name: 'manual_boost', logKey: 'manual_boost', query: EXTRA_RULE_MANUAL_BOOST },
  { name: 'manual_insert', logKey: 'manual_insert', query: EXTRA_RULE_MANUAL_INSERT },
];

export { EXTRA_SIBLING_RULES };
export type { SiblingExtraRuleDefinition };

const logger = require('../../logging/logger');
import {
  REFRESH_CHUNK_SQL,
  SIBLING_STATS_SQL,
  SIBLING_STATS_BY_RULE_SQL,
} from './siblingDetectionQueries';
import { FLEET_SSID_SQL_LIST } from './siblingDetectionConstants';

// Extra rules run as separate statements to avoid PostgreSQL's
// "ON CONFLICT DO UPDATE command cannot affect row a second time" crash
// when overlapping pairs match multiple rules within a single command.
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
      AND COALESCE(a.bestlat, a.lastlat) IS NOT NULL
      AND COALESCE(a.bestlon, a.lastlon) IS NOT NULL
      AND COALESCE(b.bestlat, b.lastlat) IS NOT NULL
      AND COALESCE(b.bestlon, b.bestlon) IS NOT NULL
      AND ST_Distance(
        ST_SetSRID(ST_MakePoint(COALESCE(a.bestlon, a.lastlon), COALESCE(a.bestlat, a.lastlat)), 4326)::geography,
        ST_SetSRID(ST_MakePoint(COALESCE(b.bestlon, b.bestlon), COALESCE(b.bestlat, b.lastlat)), 4326)::geography
      ) < 200
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
      ON ST_Distance(
           ST_SetSRID(ST_MakePoint(COALESCE(a.bestlon, a.lastlon), COALESCE(a.bestlat, a.lastlat)), 4326)::geography,
           ST_SetSRID(ST_MakePoint(COALESCE(b.bestlon, b.lastlon), COALESCE(b.bestlat, b.lastlat)), 4326)::geography
         ) < 150
     AND b.ssid = a.ssid
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
      AND lower(regexp_replace(a.ssid, '[^a-z0-9]+', '', 'g')) NOT IN (${FLEET_SSID_SQL_LIST})
      AND lower(regexp_replace(a.ssid, '[^a-z0-9]+', '', 'g')) NOT LIKE 'hmc%'
      AND COALESCE(a.bestlat, a.lastlat) IS NOT NULL
      AND COALESCE(a.bestlon, a.lastlon) IS NOT NULL
      AND COALESCE(b.bestlat, b.lastlat) IS NOT NULL
      AND COALESCE(b.bestlon, b.lastlon) IS NOT NULL
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
  WITH inserted AS (
    INSERT INTO app.network_sibling_pairs (
      bssid1, bssid2, rule, confidence, ssid1, ssid2, distance_m, matched_octets, pair_strength, quality_scope, computed_at,
      run_id
    )
    SELECT
      LEAST(a.bssid, b.bssid),
      GREATEST(a.bssid, b.bssid),
      'cross_oui_ssid_exact',
      LEAST(1.000, 0.88),
      a.ssid,
      b.ssid,
      ST_Distance(
        ST_SetSRID(ST_MakePoint(COALESCE(a.bestlon, a.lastlon), COALESCE(a.bestlat, a.lastlat)), 4326)::geography,
        ST_SetSRID(ST_MakePoint(COALESCE(b.bestlon, b.lastlon), COALESCE(b.bestlat, b.lastlat)), 4326)::geography
      ),
      'ssid+proximity',
      'candidate',
      'default',
      now(),
      $1::integer
    FROM app.networks a
    JOIN app.networks b
      ON b.ssid = a.ssid
     AND SUBSTRING(b.bssid, 1, 8) <> SUBSTRING(a.bssid, 1, 8)
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
      AND lower(regexp_replace(a.ssid, '[^a-z0-9]+', '', 'g')) NOT IN (${FLEET_SSID_SQL_LIST})
      AND lower(regexp_replace(a.ssid, '[^a-z0-9]+', '', 'g')) NOT LIKE 'hmc%'
      AND COALESCE(a.bestlat, a.lastlat) IS NOT NULL
      AND COALESCE(a.bestlon, a.lastlon) IS NOT NULL
      AND COALESCE(b.bestlat, b.lastlat) IS NOT NULL
      AND COALESCE(b.bestlon, b.lastlon) IS NOT NULL
      AND ST_Distance(
        ST_SetSRID(ST_MakePoint(COALESCE(a.bestlon, a.lastlon), COALESCE(a.bestlat, a.lastlat)), 4326)::geography,
        ST_SetSRID(ST_MakePoint(COALESCE(b.bestlon, b.lastlon), COALESCE(b.bestlat, b.lastlat)), 4326)::geography
      ) < 200
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
      ON SUBSTRING(b.bssid, 1, 11) = SUBSTRING(a.bssid, 1, 11)
     AND ABS(
           ('x' || SUBSTRING(b.bssid, 16, 2))::bit(8)::int -
           ('x' || SUBSTRING(a.bssid, 16, 2))::bit(8)::int
         ) BETWEEN 1 AND 6
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
      AND COALESCE(a.bestlat, a.lastlat) IS NOT NULL
      AND COALESCE(a.bestlon, a.lastlon) IS NOT NULL
      AND COALESCE(b.bestlat, b.lastlat) IS NOT NULL
      AND COALESCE(b.bestlon, b.lastlon) IS NOT NULL
      AND ST_Distance(
        ST_SetSRID(ST_MakePoint(COALESCE(a.bestlon, a.lastlon), COALESCE(a.bestlat, a.lastlat)), 4326)::geography,
        ST_SetSRID(ST_MakePoint(COALESCE(b.bestlon, b.lastlon), COALESCE(b.bestlat, b.lastlat)), 4326)::geography
      ) <= 300
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
      AND a.lat IS NOT NULL AND a.lon IS NOT NULL
      AND b.lat IS NOT NULL AND b.lon IS NOT NULL
      AND ST_Distance(
        ST_SetSRID(ST_MakePoint(a.lon, a.lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(b.lon, b.lat), 4326)::geography
      ) <= 200
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
      ON SUBSTRING(b.bssid, 1, 14) = SUBSTRING(a.bssid, 1, 14)
     AND ABS(
           ('x' || SUBSTRING(b.bssid, 16, 2))::bit(8)::int -
           ('x' || SUBSTRING(a.bssid, 16, 2))::bit(8)::int
         ) BETWEEN 1 AND 15
     AND b.bssid > a.bssid
     AND b.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
    LEFT JOIN app.network_sibling_overrides nso
      ON nso.bssid1 = LEAST(a.bssid, b.bssid)
     AND nso.bssid2 = GREATEST(a.bssid, b.bssid)
     AND nso.relation = 'not_sibling'
     AND nso.is_active = true
    WHERE a.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
      AND SUBSTRING(a.bssid, 1, 8) IN ('24:D7:9C', 'C8:28:E5')
      AND nso.bssid1 IS NULL
      AND COALESCE(a.bestlat, a.lastlat) IS NOT NULL
      AND COALESCE(a.bestlon, a.lastlon) IS NOT NULL
      AND COALESCE(b.bestlat, b.lastlat) IS NOT NULL
      AND COALESCE(b.bestlon, b.lastlon) IS NOT NULL
      AND ST_Distance(
        ST_SetSRID(ST_MakePoint(COALESCE(a.bestlon, a.lastlon), COALESCE(a.bestlat, a.lastlat)), 4326)::geography,
        ST_SetSRID(ST_MakePoint(COALESCE(b.bestlon, b.lastlon), COALESCE(b.bestlat, b.lastlat)), 4326)::geography
      ) <= 500
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
      AND COALESCE(a.bestlat, a.lastlat) IS NOT NULL
      AND COALESCE(a.bestlon, a.lastlon) IS NOT NULL
      AND COALESCE(b.bestlat, b.lastlat) IS NOT NULL
      AND COALESCE(b.bestlon, b.lastlon) IS NOT NULL
      AND ST_Distance(
        ST_SetSRID(ST_MakePoint(COALESCE(a.bestlon, a.lastlon), COALESCE(a.bestlat, a.lastlat)), 4326)::geography,
        ST_SetSRID(ST_MakePoint(COALESCE(b.bestlon, b.lastlon), COALESCE(b.bestlat, b.lastlat)), 4326)::geography
      ) <= 300
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
      ON SUBSTRING(b.bssid, 1, 14) = SUBSTRING(a.bssid, 1, 14)
     AND ABS(
           ('x' || SUBSTRING(b.bssid, 16, 2))::bit(8)::int -
           ('x' || SUBSTRING(a.bssid, 16, 2))::bit(8)::int
         ) BETWEEN 1 AND 13
     AND b.bssid > a.bssid
     AND b.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
    LEFT JOIN app.network_sibling_overrides nso
      ON nso.bssid1 = LEAST(a.bssid, b.bssid)
     AND nso.bssid2 = GREATEST(a.bssid, b.bssid)
     AND nso.relation = 'not_sibling'
     AND nso.is_active = true
    WHERE a.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
      AND SUBSTRING(a.bssid, 1, 8) = '30:57:8E'
      AND nso.bssid1 IS NULL
      AND COALESCE(a.bestlat, a.lastlat) IS NOT NULL
      AND COALESCE(a.bestlon, a.lastlon) IS NOT NULL
      AND COALESCE(b.bestlat, b.lastlat) IS NOT NULL
      AND COALESCE(b.bestlon, b.lastlon) IS NOT NULL
      AND ST_Distance(
        ST_SetSRID(ST_MakePoint(COALESCE(a.bestlon, a.lastlon), COALESCE(a.bestlat, a.lastlat)), 4326)::geography,
        ST_SetSRID(ST_MakePoint(COALESCE(b.bestlon, b.lastlon), COALESCE(b.bestlat, b.lastlat)), 4326)::geography
      ) <= 300
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
import {
  getSiblingRefreshStatus,
  normalizeOptions,
  state,
  type SiblingRefreshOptions,
  type SiblingRefreshResult,
  type SiblingRefreshStatus,
} from './siblingDetectionState';

const adminQuery = (text: string, params: any[] = []) =>
  require('../../config/container').adminDbService.adminQuery(text, params);

const longRunningAdminQuery = (text: string, params: any[] = []) =>
  require('../../config/container').adminDbService.longRunningAdminQuery(text, params);

async function runSiblingRefreshJob(
  options: SiblingRefreshOptions = {}
): Promise<SiblingRefreshResult> {
  const normalized = normalizeOptions(options);
  const started = Date.now();

  // Determine run_mode from options
  const runMode =
    normalized.maxBatches !== null ? 'test' : normalized.incremental ? 'incremental' : 'full';

  // Create a sibling_runs row to track this refresh
  const runInsert = await adminQuery(
    `INSERT INTO app.sibling_runs
       (run_mode, max_octet_delta, min_confidence, batch_size, max_batches)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      runMode,
      normalized.maxOctetDelta,
      normalized.minCandidateConf,
      normalized.batchSize,
      normalized.maxBatches,
    ]
  );
  const runId: number = runInsert.rows[0].id;

  // Snapshot MAX(computed_at) BEFORE the loop so incremental mode uses a
  // stable cutoff. Without this, batch 2+ would see pairs inserted by batch 1
  // and filter out all remaining seeds, stopping after one batch.
  const cutoffResult = await adminQuery(
    `SELECT MAX(computed_at) AS cutoff FROM app.network_sibling_pairs`
  );
  const incrementalCutoff: string | null = cutoffResult.rows[0]?.cutoff ?? null;

  let cursor: string | null = null;
  let batchesRun = 0;
  let seedsProcessed = 0;
  let rowsUpserted = 0;
  let completed = true;

  while (true) {
    if (state.cancelRequested) {
      completed = false;
      logger.info('[Siblings] Cancel requested — stopping batch loop');
      break;
    }
    if (normalized.maxBatches !== null && batchesRun >= normalized.maxBatches) {
      completed = false;
      break;
    }
    const result: any = await longRunningAdminQuery(REFRESH_CHUNK_SQL, [
      normalized.batchSize,
      cursor,
      normalized.maxOctetDelta,
      normalized.maxDistanceM,
      normalized.minCandidateConf,
      normalized.incremental,
      incrementalCutoff,
      runId,
    ]);

    const row = result.rows[0] || {};
    const seedCount = Number(row.seed_count || 0);
    const upsertedCount = Number(row.upserted_count || 0);
    const nextCursor = row.next_cursor || null;

    if (seedCount === 0) {
      if (!cursor || cursor >= 'FF:FF:FF:FF:FF:FF') {
        break;
      }
      // If we have a gap but haven't reached the end of the BSSID space,
      // we need to advance the cursor. However, REFRESH_CHUNK_SQL using
      // bssid > $2 with ORDER BY already handles gaps by finding the next
      // available network. If it returns 0 rows, there really are no more
      // networks in the table matching the criteria. We break to be safe
      // and avoid infinite loops, but align with the requested check.
      break;
    }

    batchesRun += 1;
    seedsProcessed += seedCount;
    rowsUpserted += upsertedCount;
    cursor = nextCursor;

    state.progress = {
      batchesRun,
      seedsProcessed,
      rowsUpserted,
      lastCursor: cursor,
    };

    if (batchesRun % 10 === 0) {
      logger.info('[Siblings] Batch progress', {
        batchesRun,
        seedsProcessed,
        rowsUpserted,
        lastCursor: cursor,
      });
    }
  }

  // Extra rules run sequentially
  const runRule = async (name: string, query: string, params: any[] = []) => {
    try {
      const res: any = await longRunningAdminQuery(query, params);
      return Number(res.rows[0]?.count || 0);
    } catch (err: any) {
      logger.error(`[Siblings] Extra rule ${name} failed:`, { error: err?.message });
      return 0;
    }
  };

  const upperCount = await runRule('upper_rotation', EXTRA_RULE_UPPER_ROTATION, [runId]);
  const ssidCountRes = await runRule('ssid_anchor', EXTRA_RULE_SSID_ANCHOR, [runId]);
  const crossCount = await runRule('cross_oui', EXTRA_RULE_CROSS_OUI_SSID, [runId]);
  const proximityCount = await runRule('same_oui_proximity', EXTRA_RULE_SAME_OUI_PROXIMITY, [
    runId,
  ]);
  const octet4Count = await runRule('octet4_rotation_64', EXTRA_RULE_OCTET4_ROTATION_64, [runId]);
  const ciscoQuadCount = await runRule('cisco_quad_radio', EXTRA_RULE_CISCO_QUAD_RADIO, [runId]);
  const geneseeCount = await runRule('genesee_county', EXTRA_RULE_GENESEE_COUNTY, [runId]);
  const targetCount = await runRule('target_retail', EXTRA_RULE_TARGET_RETAIL, [runId]);
  const rglideCount = await runRule('rglide_wide', EXTRA_RULE_RGLIDE_WIDE, [runId]);
  const boostCount = await runRule('manual_boost', EXTRA_RULE_MANUAL_BOOST);
  const insertCount = await runRule('manual_insert', EXTRA_RULE_MANUAL_INSERT);

  logger.info('[Siblings] Extra rules complete', {
    upper_rotation: upperCount,
    ssid_anchor: ssidCountRes,
    cross_oui: crossCount,
    same_oui_proximity: proximityCount,
    octet4_rotation_64: octet4Count,
    cisco_quad_radio: ciscoQuadCount,
    genesee_county: geneseeCount,
    target_retail: targetCount,
    rglide_wide: rglideCount,
    manual_boost: boostCount,
    manual_insert: insertCount,
  });

  const finalStatus = completed ? 'completed' : 'truncated';
  await adminQuery(
    `UPDATE app.sibling_runs
     SET completed_at = now(), status = $1, networks_scanned = $2, pairs_inserted = $3, pairs_updated = $3
     WHERE id = $4`,
    [finalStatus, seedsProcessed, rowsUpserted, runId]
  );

  await longRunningAdminQuery('SELECT app.refresh_oui_sibling_profiles()');
  logger.info('[Siblings] OUI sibling profiles refreshed');

  return {
    success: true,
    batchesRun,
    seedsProcessed,
    rowsUpserted,
    lastCursor: cursor,
    executionTimeMs: Date.now() - started,
    completed,
    sibling_run_id: runId,
  };
}

async function startSiblingRefresh(
  options: SiblingRefreshOptions = {}
): Promise<{ accepted: boolean; status: SiblingRefreshStatus }> {
  if (state.running) {
    return { accepted: false, status: getSiblingRefreshStatus() };
  }

  state.running = true;
  state.cancelRequested = false;
  state.startedAt = new Date().toISOString();
  state.finishedAt = null;
  state.lastError = null;
  state.lastResult = null;
  state.options = normalizeOptions(options);
  state.progress = {
    batchesRun: 0,
    seedsProcessed: 0,
    rowsUpserted: 0,
    lastCursor: null,
  };

  logger.info('[Siblings] Starting sibling refresh job', state.options);

  // Capture runMode for use in .then()/.catch() blocks
  const capturedRunMode =
    state.options.maxBatches !== null ? 'test' : state.options.incremental ? 'incremental' : 'full';

  // Write to background_job_runs BEFORE async job starts
  try {
    await adminQuery(
      `INSERT INTO app.background_job_runs (job_name, status, cron, started_at, details)
       VALUES ($1, $2, $3, now(), $4)`,
      ['siblingDetection', 'running', null, JSON.stringify(state.options)]
    );
    logger.info('[Siblings] Background job run record created');
  } catch (err: any) {
    logger.error('[Siblings] Failed to create background job run record', { error: err?.message });
  }

  runSiblingRefreshJob(state.options)
    .then((result) => {
      state.lastResult = result;
      logger.info('[Siblings] Sibling refresh job completed', result);
      // Mark background_job_runs as completed
      adminQuery(
        `UPDATE app.background_job_runs 
         SET status = $1, finished_at = now(), 
             details = jsonb_build_object(
               'pairs_inserted', $4,
               'networks_scanned', $5,
               'run_mode', $6,
               'sibling_run_id', $7
             )
         WHERE job_name = $2 AND status = $3 ORDER BY id DESC LIMIT 1`,
        [
          'completed',
          'siblingDetection',
          'running',
          result.rowsUpserted,
          result.seedsProcessed,
          capturedRunMode,
          result.sibling_run_id,
        ]
      ).catch((err: any) => {
        logger.error('[Siblings] Failed to update background job run to completed', {
          error: err?.message,
        });
      });
    })
    .catch((err: any) => {
      state.lastError = err?.message || 'Unknown error';
      logger.error('[Siblings] Sibling refresh job failed', { error: err?.message });
      // Mark background_job_runs as failed
      // Query for the most recent sibling_runs id that was running
      adminQuery(
        `SELECT id FROM app.sibling_runs 
         WHERE status = 'running' 
         ORDER BY id DESC LIMIT 1`
      )
        .then((runResult: any) => {
          const siblingRunId = runResult.rows[0]?.id || null;
          adminQuery(
            `UPDATE app.background_job_runs 
           SET status = $1, finished_at = now(), error = $2,
               details = jsonb_build_object(
                 'run_mode', $4,
                 'sibling_run_id', $5
               )
           WHERE job_name = $3 AND status = 'running' ORDER BY id DESC LIMIT 1`,
            [
              'failed',
              err?.message || 'Unknown error',
              'siblingDetection',
              capturedRunMode,
              siblingRunId,
            ]
          ).catch((err: any) => {
            logger.error('[Siblings] Failed to update background job run to failed', {
              error: err?.message,
            });
          });
        })
        .catch((err: any) => {
          logger.error('[Siblings] Failed to query sibling_runs for failed job', {
            error: err?.message,
          });
        });
    })
    .finally(() => {
      state.running = false;
      state.finishedAt = new Date().toISOString();
    });

  return { accepted: true, status: getSiblingRefreshStatus() };
}

async function getSiblingStats(): Promise<any> {
  const { rows } = await adminQuery(SIBLING_STATS_SQL);
  return rows[0] || {};
}

async function getSiblingStatsByRule(): Promise<any[]> {
  const { rows } = await adminQuery(SIBLING_STATS_BY_RULE_SQL);
  return rows;
}

/**
 * Reconcile in-memory sibling job state with the database.
 * If in-memory says NOT running but DB has a stale 'running' row,
 * mark it failed with reason 'Interrupted by container restart'.
 */
async function reconcileSiblingState(): Promise<void> {
  if (!state.running) {
    // Check if there's a stale 'running' row in background_job_runs
    const bgResult = await adminQuery(
      `SELECT id FROM app.background_job_runs WHERE job_name = $1 AND status = $2 ORDER BY id DESC LIMIT 1`,
      ['siblingDetection', 'running']
    );
    if (bgResult.rows.length > 0) {
      logger.warn('[Siblings] Found stale running row in background_job_runs; marking failed', {
        id: bgResult.rows[0].id,
      });
      await adminQuery(
        `UPDATE app.background_job_runs SET status = $1, finished_at = now(), error = $2 WHERE job_name = $3 AND status = $4`,
        ['failed', 'Interrupted by container restart', 'siblingDetection', 'running']
      );
    }

    // Also check sibling_runs
    const siblingResult = await adminQuery(
      `SELECT id FROM app.sibling_runs WHERE status = $1 ORDER BY id DESC LIMIT 1`,
      ['running']
    );
    if (siblingResult.rows.length > 0) {
      logger.warn('[Siblings] Found stale running row in sibling_runs; marking failed', {
        id: siblingResult.rows[0].id,
      });
      await adminQuery(
        `UPDATE app.sibling_runs SET status = $1, completed_at = now() WHERE status = $2`,
        ['failed', 'running']
      );
    }
  }
}

async function cancelSiblingRefresh(): Promise<{ accepted: boolean; message: string }> {
  // First reconcile DB state
  await reconcileSiblingState();

  const dbUpdates: string[] = [];

  if (state.running) {
    // In-memory job is running — set cancel flag and update both tables
    state.cancelRequested = true;
    dbUpdates.push('in-memory job cancelled');
  }

  // ALWAYS check and update background_job_runs
  const bgJobResult = await adminQuery(
    `UPDATE app.background_job_runs SET status = $1, finished_at = now(), error = $2
     WHERE job_name = $3 AND status = $4 RETURNING id`,
    ['failed', 'Cancelled by operator', 'siblingDetection', 'running']
  );
  if (bgJobResult.rowCount && bgJobResult.rowCount > 0) {
    dbUpdates.push(`background_job_runs updated (${bgJobResult.rowCount} row)`);
  }

  // ALWAYS check and update sibling_runs
  const siblingResult = await adminQuery(
    `UPDATE app.sibling_runs SET status = $1, completed_at = now()
     WHERE status = $2 RETURNING id`,
    ['failed', 'running']
  );
  if (siblingResult.rowCount && siblingResult.rowCount > 0) {
    dbUpdates.push(`sibling_runs updated (${siblingResult.rowCount} row)`);
  }

  // Return success if anything changed (in-memory flag or DB rows)
  if (state.running || dbUpdates.length > 1) {
    return {
      accepted: true,
      message: `Job cancelled. Updates: ${dbUpdates.join(', ')}`,
    };
  }

  return { accepted: false, message: 'No job is currently running' };
}

async function purgeSiblingPairs(): Promise<{ deleted: number }> {
  const result = await adminQuery('TRUNCATE app.network_sibling_pairs');
  logger.info('[Siblings] Purged all sibling pairs');
  return { deleted: result.rowCount ?? 0 };
}

/**
 * Get reconciled sibling refresh status — checks both in-memory state and DB.
 * Auto-fixes stale DB rows if in-memory says NOT running.
 * Never returns 'running' unless in-memory state confirms it.
 */
async function getSiblingRefreshStatusReconciled(): Promise<SiblingRefreshStatus> {
  // First reconcile DB state with in-memory
  await reconcileSiblingState();

  // If in-memory says running, trust it
  if (state.running) {
    return getSiblingRefreshStatus();
  }

  // In-memory is NOT running — verify DB doesn't have stale running rows
  const bgRunning = await adminQuery(
    `SELECT id FROM app.background_job_runs WHERE job_name = $1 AND status = $2 LIMIT 1`,
    ['siblingDetection', 'running']
  );

  const siblingRunning = await adminQuery(
    `SELECT id FROM app.sibling_runs WHERE status = $1 LIMIT 1`,
    ['running']
  );

  // If we find any stale running rows, they were auto-fixed by reconcileSiblingState above
  if (bgRunning.rows.length > 0 || siblingRunning.rows.length > 0) {
    logger.info('[Siblings] Stale running rows were auto-fixed during reconciliation');
  }

  return getSiblingRefreshStatus();
}

module.exports = {
  startSiblingRefresh,
  cancelSiblingRefresh,
  getSiblingRefreshStatus,
  getSiblingRefreshStatusReconciled,
  getSiblingStats,
  getSiblingStatsByRule,
  runSiblingRefreshJob,
  purgeSiblingPairs,
  reconcileSiblingState,
};

export {};

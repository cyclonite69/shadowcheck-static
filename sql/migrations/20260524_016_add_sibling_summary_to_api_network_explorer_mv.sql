-- Migration: 20260524_016_add_sibling_summary_to_api_network_explorer_mv.sql
--
-- Bake precomputed sibling summary metadata into app.api_network_explorer_mv.
-- This keeps the Geospatial map/list read path on the MV and avoids joining
-- app.network_sibling_pairs during the initial page load.

CREATE INDEX IF NOT EXISTS idx_network_sibling_pairs_bssid1_upper
  ON app.network_sibling_pairs (upper(bssid1));

CREATE INDEX IF NOT EXISTS idx_network_sibling_pairs_bssid2_upper
  ON app.network_sibling_pairs (upper(bssid2));

CREATE INDEX IF NOT EXISTS idx_network_sibling_pairs_confidence
  ON app.network_sibling_pairs (confidence DESC);

DO $$
DECLARE
  api_mv_definition text;
  deflock_view_definition text;
  density_mv_definition text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'app.api_network_explorer_mv'::regclass
      AND attname = 'has_siblings'
      AND NOT attisdropped
  ) THEN
    RETURN;
  END IF;

  SELECT pg_get_viewdef('app.api_network_explorer_mv'::regclass, true)
    INTO api_mv_definition;
  api_mv_definition := regexp_replace(api_mv_definition, ';\s*$', '');

  PERFORM set_config('search_path', 'app, public', true);

  IF to_regclass('app.surveillance_deflock_matches') IS NOT NULL THEN
    SELECT pg_get_viewdef('app.surveillance_deflock_matches'::regclass, true)
      INTO deflock_view_definition;
  END IF;

  IF to_regclass('app.surveillance_density_zones') IS NOT NULL THEN
    SELECT pg_get_viewdef('app.surveillance_density_zones'::regclass, true)
      INTO density_mv_definition;
  END IF;

  DROP VIEW IF EXISTS app.surveillance_deflock_matches CASCADE;
  DROP MATERIALIZED VIEW IF EXISTS app.surveillance_density_zones CASCADE;
  DROP MATERIALIZED VIEW app.api_network_explorer_mv;

  EXECUTE format($create_mv$
    CREATE MATERIALIZED VIEW app.api_network_explorer_mv AS
    WITH base_networks AS (
      %s
    )
    SELECT
      base_networks.*,
      COALESCE(sib.sibling_count, 0) > 0 AS has_siblings,
      COALESCE(sib.sibling_count, 0) AS sibling_count,
      sib.sibling_max_confidence,
      COALESCE(sib.has_strong_sibling, false) AS has_strong_sibling,
      COALESCE(sib.sibling_bssids, ARRAY[]::text[]) AS sibling_bssids
    FROM base_networks
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::integer AS sibling_count,
        MAX(nsp.confidence) AS sibling_max_confidence,
        BOOL_OR(nsp.confidence >= 0.97) AS has_strong_sibling,
        ARRAY_AGG(
          CASE
            WHEN upper(nsp.bssid1) = upper(base_networks.bssid) THEN nsp.bssid2
            ELSE nsp.bssid1
          END
          ORDER BY nsp.confidence DESC
        ) AS sibling_bssids
      FROM app.network_sibling_pairs nsp
      WHERE upper(nsp.bssid1) = upper(base_networks.bssid)
         OR upper(nsp.bssid2) = upper(base_networks.bssid)
    ) sib ON TRUE
  $create_mv$, api_mv_definition);

  IF deflock_view_definition IS NOT NULL THEN
    EXECUTE format(
      'CREATE VIEW app.surveillance_deflock_matches AS %s',
      deflock_view_definition
    );
  END IF;

  IF density_mv_definition IS NOT NULL THEN
    EXECUTE format(
      'CREATE MATERIALIZED VIEW app.surveillance_density_zones AS %s',
      density_mv_definition
    );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_network_explorer_mv_bssid
  ON app.api_network_explorer_mv (bssid);
CREATE INDEX IF NOT EXISTS idx_api_network_explorer_mv_type
  ON app.api_network_explorer_mv (type);
CREATE INDEX IF NOT EXISTS idx_api_network_explorer_mv_observed_at
  ON app.api_network_explorer_mv (observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_network_explorer_mv_threat
  ON app.api_network_explorer_mv (threat_score DESC);
CREATE INDEX IF NOT EXISTS idx_api_network_explorer_mv_rule_score
  ON app.api_network_explorer_mv (rule_based_score DESC);
CREATE INDEX IF NOT EXISTS idx_api_network_explorer_mv_ml_score
  ON app.api_network_explorer_mv (ml_threat_score DESC);
CREATE INDEX IF NOT EXISTS idx_api_network_explorer_mv_stationary
  ON app.api_network_explorer_mv (stationary_confidence)
  WHERE stationary_confidence IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_network_explorer_mv_ignored
  ON app.api_network_explorer_mv (is_ignored)
  WHERE is_ignored = TRUE;

DO $$
BEGIN
  IF to_regclass('app.surveillance_density_zones') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_surveillance_density_zones_id
      ON app.surveillance_density_zones (id);
    CREATE INDEX IF NOT EXISTS idx_surveillance_density_zones_geom
      ON app.surveillance_density_zones USING GIST (geom);
    CREATE INDEX IF NOT EXISTS idx_surveillance_density_zones_weight
      ON app.surveillance_density_zones (density_weight DESC);
    CREATE INDEX IF NOT EXISTS idx_surveillance_density_zones_ratio
      ON app.surveillance_density_zones (surveillance_ratio DESC);
  END IF;
END $$;

GRANT SELECT ON app.api_network_explorer_mv TO shadowcheck_user;
GRANT SELECT ON app.api_network_explorer_mv TO grafana_reader;
GRANT SELECT ON app.api_network_explorer_mv TO PUBLIC;

DO $$
BEGIN
  IF to_regclass('app.surveillance_deflock_matches') IS NOT NULL THEN
    GRANT SELECT ON app.surveillance_deflock_matches TO shadowcheck_user;
    GRANT SELECT ON app.surveillance_deflock_matches TO grafana_reader;
    GRANT SELECT ON app.surveillance_deflock_matches TO PUBLIC;
  END IF;

  IF to_regclass('app.surveillance_density_zones') IS NOT NULL THEN
    GRANT SELECT ON app.surveillance_density_zones TO shadowcheck_user;
    GRANT SELECT ON app.surveillance_density_zones TO grafana_reader;
    GRANT SELECT ON app.surveillance_density_zones TO PUBLIC;
  END IF;
END $$;

ANALYZE app.api_network_explorer_mv;
ANALYZE app.network_sibling_pairs;

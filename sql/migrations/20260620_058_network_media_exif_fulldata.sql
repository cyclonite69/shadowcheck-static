-- Migration: Add full EXIF metadata columns and constrain coordinate precision.
-- 20260620_058_network_media_exif_fulldata.sql

-- PostgreSQL cannot change the coordinate types while the sibling discovery
-- view or locations view depends on them. Recreate the views after the ALTER.
DROP VIEW IF EXISTS app.v_sibling_group_media;
DROP VIEW IF EXISTS app.network_media_locations;

ALTER TABLE app.network_media
  ALTER COLUMN exif_lat TYPE numeric(10,8),
  ALTER COLUMN exif_lon TYPE numeric(11,8),
  ADD COLUMN IF NOT EXISTS exif_make varchar(100),
  ADD COLUMN IF NOT EXISTS exif_model varchar(100),
  ADD COLUMN IF NOT EXISTS exif_altitude numeric(9,3),
  ADD COLUMN IF NOT EXISTS exif_bearing numeric(6,3),
  ADD COLUMN IF NOT EXISTS exif_width integer,
  ADD COLUMN IF NOT EXISTS exif_height integer;

-- Recreate network_media_locations view
CREATE OR REPLACE VIEW app.network_media_locations AS
SELECT id AS media_id,
    bssid,
    filename,
    mime_type,
    created_at,
    exif_lat AS lat,
    exif_lon AS lon,
    exif_captured_at AS observed_at,
    bssid::text <> 'VISINT_UNMATCHED'::text AS is_matched
FROM app.network_media;

DO $migration$
BEGIN
  -- shadowcheck_test may predate the connected-component MV. In that drifted
  -- state the repository intentionally falls back to direct media.
  IF to_regclass('app.mv_sibling_groups') IS NOT NULL THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW app.v_sibling_group_media AS
      WITH group_members AS (
        SELECT
          s1.bssid AS member_bssid,
          s2.bssid AS sibling_bssid
        FROM app.mv_sibling_groups s1
        JOIN app.mv_sibling_groups s2 ON s1.group_id = s2.group_id
      )
      SELECT
        gm.member_bssid,
        nm.id,
        'media'::text AS record_type,
        nm.bssid AS source_bssid,
        nm.observation_id,
        nm.media_type,
        nm.filename,
        nm.file_size,
        nm.mime_type,
        nm.description,
        nm.exif_lat,
        nm.exif_lon,
        nm.exif_captured_at,
        nm.created_at,
        NULL::text AS note_content,
        NULL::text AS note_type
      FROM group_members gm
      JOIN app.network_media nm ON nm.bssid = gm.sibling_bssid
      WHERE nm.bssid != 'VISINT_UNMATCHED'

      UNION ALL

      SELECT
        gm.member_bssid,
        nn.id,
        'note'::text,
        nn.bssid AS source_bssid,
        NULL::bigint AS observation_id,
        NULL::text AS media_type,
        NULL::text AS filename,
        NULL::bigint AS file_size,
        NULL::text AS mime_type,
        NULL::text AS description,
        NULL::numeric(10,8) AS exif_lat,
        NULL::numeric(11,8) AS exif_lon,
        NULL::timestamptz AS exif_captured_at,
        nn.created_at,
        nn.content AS note_content,
        nn.note_type
      FROM group_members gm
      JOIN app.network_notes nn ON nn.bssid = gm.sibling_bssid
      WHERE nn.is_deleted IS NOT TRUE
    $view$;
  END IF;
END
$migration$;

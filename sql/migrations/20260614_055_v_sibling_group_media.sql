-- Migration: Create sibling group media float-up view
-- 20260614_055_v_sibling_group_media.sql
--
-- Given any member BSSID, surfaces all media and notes for the full
-- sibling group with provenance (source_bssid column).
--
-- Usage:
--   SELECT * FROM app.v_sibling_group_media WHERE member_bssid = 'AA:BB:CC:DD:EE:FF';
--
-- Depends on: 20260614_053 (surrogate PK), 20260614_054 (sibling_group_id columns)

-- Ensure EXIF columns exist (idempotent, may have been added by _049)
ALTER TABLE app.network_media ADD COLUMN IF NOT EXISTS exif_lat numeric;
ALTER TABLE app.network_media ADD COLUMN IF NOT EXISTS exif_lon numeric;
ALTER TABLE app.network_media ADD COLUMN IF NOT EXISTS exif_captured_at timestamptz;

CREATE OR REPLACE VIEW app.v_sibling_group_media AS
WITH member_pairs AS (
  -- For any bssid, find all sibling pair ids where it appears on either side
  SELECT id AS pair_id, bssid1 AS member_bssid FROM app.network_sibling_pairs
  UNION ALL
  SELECT id AS pair_id, bssid2 AS member_bssid FROM app.network_sibling_pairs
),
sibling_bssids AS (
  -- For each member bssid, collect all co-member bssids in the group
  SELECT
    mp1.member_bssid,
    mp2.member_bssid AS sibling_bssid
  FROM member_pairs mp1
  JOIN member_pairs mp2 ON mp1.pair_id = mp2.pair_id
)
-- Media scoped to a sibling bssid (floats up read-only)
SELECT
  sb.member_bssid,
  nm.id,
  'media'::text AS record_type,
  nm.bssid AS source_bssid,
  nm.media_type,
  nm.filename,
  nm.file_size,
  nm.mime_type,
  nm.description,
  nm.exif_lat,
  nm.exif_lon,
  nm.exif_captured_at,
  nm.created_at,
  nm.observation_id,
  nm.sibling_group_id,
  NULL::text AS note_content,
  NULL::text AS note_type
FROM sibling_bssids sb
JOIN app.network_media nm ON nm.bssid = sb.sibling_bssid
WHERE nm.bssid != 'VISINT_UNMATCHED'

UNION ALL

-- Notes scoped to a sibling bssid (floats up read-only)
SELECT
  sb.member_bssid,
  nn.id,
  'note'::text AS record_type,
  nn.bssid AS source_bssid,
  NULL::text AS media_type,
  NULL::text AS filename,
  NULL::bigint AS file_size,
  NULL::text AS mime_type,
  NULL::text AS description,
  NULL::numeric AS exif_lat,
  NULL::numeric AS exif_lon,
  NULL::timestamptz AS exif_captured_at,
  nn.created_at,
  NULL::bigint AS observation_id,
  nn.sibling_group_id,
  nn.content AS note_content,
  nn.note_type
FROM sibling_bssids sb
JOIN app.network_notes nn ON nn.bssid = sb.sibling_bssid
WHERE nn.is_deleted IS NOT TRUE;

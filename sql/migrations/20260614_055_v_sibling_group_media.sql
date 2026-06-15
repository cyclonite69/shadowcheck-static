-- Migration: Create sibling group media discovery view
-- 20260614_055_v_sibling_group_media.sql
--
-- Creates app.v_sibling_group_media, a discovery layer that surfaces all
-- media and notes reachable from a given BSSID's connected sibling component.
--
-- Evidence model:
--   Media BELONGS TO:  the specific bssid/observation it matched (preserved)
--   Media DISCOVERABLE FROM: the full connected component via this view
--
-- Usage:
--   SELECT * FROM app.v_sibling_group_media WHERE member_bssid = 'AA:BB:CC:DD:EE:FF';
--
--   Returns media/notes attached to any BSSID in the same component as the
--   queried BSSID, with source_bssid and observation_id preserved for provenance.
--
-- Component semantics (via app.mv_sibling_groups):
--   group_id = min(bssid) of the connected component (lexicographic root).
--   A-B and B-C pairs → component {A, B, C} → querying A surfaces media from B and C.
--   This MV is populated by the mvRefresh background job (_048).
--
-- Depends on: 20260607_048_mv_sibling_groups (component MV must exist)
-- Depends on: 20260614_052_network_media_observation_fk (observation_id column)
-- Does NOT depend on network_sibling_pairs.id (edge handle, not used here)
-- Does NOT use sibling_group_id columns (rejected in _054)

CREATE OR REPLACE VIEW app.v_sibling_group_media AS
WITH group_members AS (
  -- For a given member_bssid, find all BSSIDs in the same connected component.
  -- mv_sibling_groups.group_id is the lexicographic-minimum BSSID in the component,
  -- stable across refreshes as long as membership is unchanged.
  SELECT
    s1.bssid AS member_bssid,
    s2.bssid AS sibling_bssid
  FROM app.mv_sibling_groups s1
  JOIN app.mv_sibling_groups s2 ON s1.group_id = s2.group_id
)
-- Media attached to any BSSID in the component
SELECT
  gm.member_bssid,
  nm.id,
  'media'::text          AS record_type,
  nm.bssid               AS source_bssid,
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
  NULL::text             AS note_content,
  NULL::text             AS note_type
FROM group_members gm
JOIN app.network_media nm ON nm.bssid = gm.sibling_bssid
WHERE nm.bssid != 'VISINT_UNMATCHED'

UNION ALL

-- Notes attached to any BSSID in the component
SELECT
  gm.member_bssid,
  nn.id,
  'note'::text,
  nn.bssid               AS source_bssid,
  NULL::bigint           AS observation_id,
  NULL::text             AS media_type,
  NULL::text             AS filename,
  NULL::bigint           AS file_size,
  NULL::text             AS mime_type,
  NULL::text             AS description,
  NULL::numeric          AS exif_lat,
  NULL::numeric          AS exif_lon,
  NULL::timestamptz      AS exif_captured_at,
  nn.created_at,
  nn.content             AS note_content,
  nn.note_type
FROM group_members gm
JOIN app.network_notes nn ON nn.bssid = gm.sibling_bssid
WHERE nn.is_deleted IS NOT TRUE;

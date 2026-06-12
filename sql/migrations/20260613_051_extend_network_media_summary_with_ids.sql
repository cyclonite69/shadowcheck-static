-- Migration: Extend network_media_summary view with media_ids array
-- 20260613_051_extend_network_media_summary_with_ids.sql

DROP VIEW IF EXISTS app.network_media_summary CASCADE;

CREATE OR REPLACE VIEW app.network_media_summary AS
SELECT
    bssid,
    COUNT(*)::integer AS media_count,
    array_agg(id::text ORDER BY id) AS media_ids
FROM app.network_media
WHERE bssid != 'VISINT_UNMATCHED'
GROUP BY bssid;

-- Migration: Add EXIF columns to network_media and create media summary view
-- 20260612_049_visint_media_columns_and_views.sql

-- 1. Add nullable EXIF columns to app.network_media
ALTER TABLE app.network_media ADD COLUMN IF NOT EXISTS exif_lat numeric;
ALTER TABLE app.network_media ADD COLUMN IF NOT EXISTS exif_lon numeric;
ALTER TABLE app.network_media ADD COLUMN IF NOT EXISTS exif_captured_at timestamptz;

-- 2. Aggregate matched media counts per BSSID for authenticated map responses.
CREATE OR REPLACE VIEW app.network_media_summary AS
SELECT
    bssid,
    COUNT(*)::integer AS media_count
FROM app.network_media
WHERE bssid != 'VISINT_UNMATCHED'
GROUP BY bssid;

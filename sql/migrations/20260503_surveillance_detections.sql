-- Migration: app.surveillance_detections
-- Stores scored surveillance device detections derived from app.networks

CREATE TABLE IF NOT EXISTS app.surveillance_detections (
    id                SERIAL PRIMARY KEY,
    bssid             TEXT NOT NULL REFERENCES app.networks(bssid) ON DELETE CASCADE,
    detected_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_type       TEXT NOT NULL,
    -- FLOCK_SAFETY_CAMERA | RAVEN_GUNSHOT_DETECTOR | FS_EXT_BATTERY | UNKNOWN_SURVEILLANCE
    confidence        NUMERIC(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    threat_score      NUMERIC(5,1) NOT NULL CHECK (threat_score >= 0 AND threat_score <= 100),
    detection_method  TEXT NOT NULL,
    -- oui_match | ssid_pattern | mfgrid_match | ble_name_pattern | uuid_match | multi_signal
    matched_signals   JSONB NOT NULL DEFAULT '{}',
    false_positive    BOOLEAN NOT NULL DEFAULT FALSE,
    fp_reason         TEXT,
    notes             TEXT,
    created_by        TEXT NOT NULL DEFAULT 'system',
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_surveillance_detections_bssid UNIQUE (bssid)
);

CREATE INDEX IF NOT EXISTS idx_surveillance_detections_device_type
    ON app.surveillance_detections (device_type);

CREATE INDEX IF NOT EXISTS idx_surveillance_detections_threat_score
    ON app.surveillance_detections (threat_score DESC);

CREATE INDEX IF NOT EXISTS idx_surveillance_detections_bssid
    ON app.surveillance_detections (bssid);

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION app.set_surveillance_detections_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_surveillance_detections_updated_at ON app.surveillance_detections;
CREATE TRIGGER trg_surveillance_detections_updated_at
    BEFORE UPDATE ON app.surveillance_detections
    FOR EACH ROW EXECUTE FUNCTION app.set_surveillance_detections_updated_at();

-- Grant access to app runtime role
GRANT SELECT ON app.surveillance_detections TO shadowcheck_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.surveillance_detections TO shadowcheck_admin;
GRANT USAGE, SELECT ON SEQUENCE app.surveillance_detections_id_seq TO shadowcheck_admin;

-- Seed job config setting for surveillance scan
INSERT INTO app.settings (key, value, description)
VALUES (
    'surveillance_scan_job_config',
    '{"enabled": true, "cron": "0 2 * * *"}'::jsonb,
    'Configuration for daily surveillance device detection scan'
)
ON CONFLICT (key) DO NOTHING;

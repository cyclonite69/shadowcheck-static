-- Create radio_manufacturers table matching CSV structure
CREATE TABLE IF NOT EXISTS app.radio_manufacturers (
    registry_type TEXT NOT NULL,
    oui_assignment_hex TEXT NOT NULL,
    prefix_24bit TEXT,
    prefix_28bit TEXT,
    prefix_36bit TEXT,
    organization_name TEXT NOT NULL,
    organization_address TEXT,
    PRIMARY KEY (registry_type, oui_assignment_hex)
);

CREATE INDEX idx_radio_manufacturers_oui ON app.radio_manufacturers(oui_assignment_hex);
CREATE INDEX idx_radio_manufacturers_prefix24 ON app.radio_manufacturers(prefix_24bit);

#!/bin/bash

set -e

SQLITE_DB="backup-1764309125210.sqlite"
PGUSER="shadowcheck_user"
PGHOST="localhost"
PGDB="shadowcheck_db"
PGPASSWORD="PjUKZCNXUaRd9HCLjv@yj0wSSvU9hoDO"

export PGPASSWORD

echo "=== SQLite to PostgreSQL Import ==="
echo "Source: $SQLITE_DB"
echo "Target: $PGDB"
echo ""

# Create staging tables
echo "Creating staging tables..."
psql -U "$PGUSER" -h "$PGHOST" -d "$PGDB" <<SQL
DROP TABLE IF EXISTS import.sqlite_location CASCADE;
DROP TABLE IF EXISTS import.sqlite_network CASCADE;

CREATE TABLE import.sqlite_location (
    _id BIGINT,
    bssid TEXT,
    level INTEGER,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    altitude DOUBLE PRECISION,
    accuracy REAL,
    time BIGINT,
    external INTEGER,
    mfgrid INTEGER
);

CREATE TABLE import.sqlite_network (
    bssid TEXT,
    ssid TEXT,
    frequency INTEGER,
    capabilities TEXT,
    lasttime BIGINT,
    lastlat DOUBLE PRECISION,
    lastlon DOUBLE PRECISION,
    type TEXT,
    bestlevel INTEGER,
    bestlat DOUBLE PRECISION,
    bestlon DOUBLE PRECISION,
    rcois TEXT,
    mfgrid INTEGER,
    service TEXT
);
SQL

echo "✓ Staging tables created"
echo ""

# Export SQLite data to CSV
echo "Exporting SQLite location data..."
sqlite3 "$SQLITE_DB" <<SQLITE > /tmp/location.csv
.mode csv
.headers off
SELECT _id, bssid, level, lat, lon, altitude, accuracy, time, external, mfgrid FROM location;
SQLITE

echo "Exporting SQLite network data..."
sqlite3 "$SQLITE_DB" <<SQLITE > /tmp/network.csv
.mode csv
.headers off
SELECT bssid, ssid, frequency, capabilities, lasttime, lastlat, lastlon, type, bestlevel, bestlat, bestlon, rcois, mfgrid, service FROM network;
SQLITE

echo "✓ CSV files created"
echo ""

# Load into staging tables
echo "Loading location data into staging..."
psql -U "$PGUSER" -h "$PGHOST" -d "$PGDB" <<SQL
\COPY import.sqlite_location FROM '/tmp/location.csv' WITH CSV;
SQL

echo "Loading network data into staging..."
psql -U "$PGUSER" -h "$PGHOST" -d "$PGDB" <<SQL
\COPY import.sqlite_network FROM '/tmp/network.csv' WITH CSV;
SQL

echo "✓ Data loaded into staging"
echo ""

# Truncate target tables
echo "Truncating target tables..."
psql -U "$PGUSER" -h "$PGHOST" -d "$PGDB" <<SQL
TRUNCATE TABLE app.observations CASCADE;
TRUNCATE TABLE app.networks CASCADE;
SQL

echo "✓ Tables truncated"
echo ""

# Transform and load observations
echo "Transforming and loading observations..."
psql -U "$PGUSER" -h "$PGHOST" -d "$PGDB" <<SQL
INSERT INTO app.observations (
    bssid, latitude, longitude, altitude_meters, accuracy_meters, 
    signal_dbm, observed_at, observed_at_epoch, location, source_type
)
SELECT 
    UPPER(bssid),
    lat,
    lon,
    altitude,
    accuracy,
    level,
    to_timestamp(time / 1000.0),
    time,
    ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
    'wigle_app'::source_type
FROM import.sqlite_location
WHERE lat BETWEEN -90 AND 90 
  AND lon BETWEEN -180 AND 180
  AND bssid IS NOT NULL
  AND bssid != ''
  AND time >= 946684800000
  AND time <= EXTRACT(EPOCH FROM NOW()) * 1000 + 86400000;
SQL

echo "✓ Observations loaded"
echo ""

# Networks will be auto-populated by triggers, but let's also backfill channel/frequency
echo "Backfilling channel from frequency..."
psql -U "$PGUSER" -h "$PGHOST" -d "$PGDB" <<SQL
-- Update channel from frequency for WiFi networks
UPDATE app.networks
SET channel = CASE
    -- 2.4 GHz band
    WHEN frequency BETWEEN 2400 AND 2500 THEN ((frequency - 2407) / 5)::integer
    -- 5 GHz band
    WHEN frequency BETWEEN 5000 AND 6000 THEN ((frequency - 5000) / 5)::integer
    -- 6 GHz band (WiFi 6E)
    WHEN frequency BETWEEN 5925 AND 7125 THEN ((frequency - 5950) / 5)::integer
    ELSE NULL
END
WHERE channel IS NULL AND frequency IS NOT NULL AND frequency > 0;

-- Update frequency from channel for WiFi networks
UPDATE app.networks
SET frequency = CASE
    -- 2.4 GHz band (channels 1-14)
    WHEN channel BETWEEN 1 AND 14 THEN 2407 + (channel * 5)
    -- 5 GHz band (channels 32-177)
    WHEN channel BETWEEN 32 AND 177 THEN 5000 + (channel * 5)
    ELSE NULL
END
WHERE frequency IS NULL AND channel IS NOT NULL;
SQL

echo "✓ Channel/frequency backfilled"
echo ""

# Show final counts
echo "=== Import Summary ==="
psql -U "$PGUSER" -h "$PGHOST" -d "$PGDB" <<SQL
SELECT 'observations' as table_name, COUNT(*) as count FROM app.observations
UNION ALL
SELECT 'networks', COUNT(*) FROM app.networks;
SQL

# Cleanup
rm -f /tmp/location.csv /tmp/network.csv

echo ""
echo "✓ Import complete"

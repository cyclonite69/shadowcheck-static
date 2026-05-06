#!/usr/bin/env python3
"""
Import ShotSpotter sensor locations from the WIRED 2024 leak dataset
(https://github.com/kevee/shotspotter-locations) into app.shotspotter_sensors.

Idempotent: ON CONFLICT on (lat, lon) DO UPDATE (upsert).

Usage (run on EC2 via SSM):
  export DB_HOST=localhost DB_PORT=5432 DB_NAME=shadowcheck_db
  export DB_USER=shadowcheck_admin DB_PASSWORD=<secret>
  python3 /home/ssm-user/shadowcheck/scripts/import_shotspotter_sensors.py

  # Dry run (print rows, don't insert):
  python3 scripts/import_shotspotter_sensors.py --dry-run

  # Override input path:
  python3 scripts/import_shotspotter_sensors.py --input /path/to/shots.json
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys

DEFAULT_INPUT = os.path.join(
    os.path.dirname(__file__), "..", "..", "shotspotter-locations", "shots.json"
)
# Fallback path for EC2
EC2_INPUT = "/home/ssm-user/shotspotter-locations/shots.json"

BATCH_SIZE = 1000


def parse_city_state(metadata: list) -> tuple[str | None, str | None, str | None]:
    """
    Extract city, state, country from metadata[0] city-code string.
    Examples: 'DetroitMIPrecinct8' -> ('Detroit', 'MI', 'US')
              'ZANelsonMandelaBayHelenvale' -> (None, None, 'ZA')
              'WorcesterMA' -> ('Worcester', 'MA', 'US')
    """
    if not metadata:
        return None, None, 'US'

    code = str(metadata[0])

    # International: starts with 2-letter country code that is NOT a US state
    US_STATES = {
        'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN',
        'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV',
        'NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN',
        'TX','UT','VT','VA','WA','WV','WI','WY','DC','PR','GU','VI',
    }
    COUNTRY_CODES = {'ZA', 'BR', 'GB', 'CA', 'MX', 'AU', 'NZ', 'IN', 'NG', 'KE', 'GH'}

    if code[:2] in COUNTRY_CODES:
        return None, None, code[:2]

    # Try to extract state: look for 2-letter uppercase state code
    m = re.search(r'([A-Z]{2})(?:[A-Z]|[0-9]|$)', code)
    if m and m.group(1) in US_STATES:
        state = m.group(1)
        city = code[:m.start()].strip() or None
        return city, state, 'US'

    return code or None, None, 'US'


def load_events(input_path: str) -> list:
    with open(input_path) as fp:
        data = json.load(fp)
    if isinstance(data, dict) and 'events' in data:
        return data['events']
    if isinstance(data, list):
        return data
    raise ValueError(f"Unexpected JSON structure in {input_path}")


def import_sensors(events: list, dry_run: bool) -> int:
    # Filter out zero-coordinate entries
    valid = [
        e for e in events
        if float(e.get('lat', 0)) != 0 or float(e.get('lon', 0)) != 0
    ]
    print(f"[ShotSpotter Import] {len(events)} total events, {len(valid)} with valid coords")

    if dry_run:
        print("[ShotSpotter Import] DRY RUN — sample rows that would be upserted:")
        for e in valid[:10]:
            lat, lon = float(e['lat']), float(e['lon'])
            meta = e.get('metadata', [])
            city, state, country = parse_city_state(meta)
            sensor_id = str(meta[0]) if meta else None
            print(f"  lat={lat:.6f} lon={lon:.6f} sensor_id={sensor_id} city={city} state={state} country={country}")
        return len(valid)

    import psycopg2  # type: ignore

    conn = psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=int(os.environ.get("DB_PORT", 5432)),
        dbname=os.environ.get("DB_NAME", "shadowcheck_db"),
        user=os.environ.get("DB_USER", "shadowcheck_admin"),
        password=os.environ.get("DB_PASSWORD", ""),
    )

    upserted = 0
    try:
        with conn:
            with conn.cursor() as cur:
                batch = []
                for i, e in enumerate(valid):
                    lat = float(e['lat'])
                    lon = float(e['lon'])
                    meta = e.get('metadata', [])
                    city, state, country = parse_city_state(meta)
                    sensor_id = str(meta[0]) if meta else None

                    batch.append((sensor_id, city, state, country, lat, lon))

                    if len(batch) >= BATCH_SIZE:
                        upserted += _flush_batch(cur, batch)
                        batch = []

                    if (i + 1) % 5000 == 0:
                        print(f"[ShotSpotter Import] Processed {i + 1}/{len(valid)} ...")

                if batch:
                    upserted += _flush_batch(cur, batch)
    finally:
        conn.close()

    return upserted


def _flush_batch(cur, batch: list) -> int:
    rows_upserted = 0
    for sensor_id, city, state, country, lat, lon in batch:
        cur.execute(
            """
            INSERT INTO app.shotspotter_sensors
              (sensor_id, city, state, country, lat, lon, geom, source)
            VALUES (%s, %s, %s, %s, %s, %s,
                    ST_SetSRID(ST_MakePoint(%s, %s), 4326),
                    'WIRED_2024_LEAK')
            ON CONFLICT (lat, lon) DO UPDATE SET
              sensor_id   = EXCLUDED.sensor_id,
              city        = EXCLUDED.city,
              state       = EXCLUDED.state,
              country     = EXCLUDED.country,
              geom        = EXCLUDED.geom,
              imported_at = NOW()
            """,
            (sensor_id, city, state, country, lat, lon, lon, lat),
        )
        rows_upserted += cur.rowcount
    return rows_upserted


def main():
    parser = argparse.ArgumentParser(description="Import ShotSpotter sensor locations from WIRED 2024 leak")
    parser.add_argument(
        "--input",
        default=None,
        help="Path to shots.json (default: repos/shotspotter-locations/shots.json)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print rows without inserting into database",
    )
    args = parser.parse_args()

    # Resolve input path
    input_path = args.input
    if not input_path:
        if os.path.exists(DEFAULT_INPUT):
            input_path = DEFAULT_INPUT
        elif os.path.exists(EC2_INPUT):
            input_path = EC2_INPUT
        else:
            print(f"[ERROR] shots.json not found. Clone https://github.com/kevee/shotspotter-locations "
                  f"or pass --input <path>", file=sys.stderr)
            sys.exit(1)

    print(f"[ShotSpotter Import] Reading from {input_path}")
    events = load_events(input_path)

    count = import_sensors(events, dry_run=args.dry_run)

    if args.dry_run:
        print(f"[ShotSpotter Import] DRY RUN complete — {count} rows would be upserted")
    else:
        print(f"[ShotSpotter Import] Done — {count} rows upserted into app.shotspotter_sensors")


if __name__ == "__main__":
    main()

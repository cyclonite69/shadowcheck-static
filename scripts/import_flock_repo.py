#!/usr/bin/env python3
"""
Import surveillance camera locations from FLOCK/CAMERAS_WITH_NETWORK_DATA.geojson
into app.deflock_cameras.

Source: OpenStreetMap-derived general surveillance camera dataset.
Idempotent: ON CONFLICT (lat, lon) DO NOTHING.

Usage (run on EC2 via SSM):
  export DB_HOST=localhost DB_PORT=5432 DB_NAME=shadowcheck_db
  export DB_USER=shadowcheck_admin DB_PASSWORD=<secret>
  python3 scripts/import_flock_repo.py

  # EC2 usage: copy GeoJSON to /tmp/ first via S3 or scp, then:
  # python3 /app/scripts/import_flock_repo.py \
  #   --input /tmp/CAMERAS_WITH_NETWORK_DATA.geojson

  # Dry run (print first 5 rows, skip insert):
  python3 scripts/import_flock_repo.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import os
import sys

GEOJSON_PATH = os.path.join(
    os.path.dirname(__file__),
    "../../FLOCK/CAMERAS_WITH_NETWORK_DATA.geojson"
)
# On EC2, override with: --input /path/to/CAMERAS_WITH_NETWORK_DATA.geojson
BATCH_SIZE = 1000
SOURCE = "FLOCK_REPO"


def extract_location(props: dict) -> tuple[str | None, str | None, str | None]:
    city = (
        props.get("addr:city")
        or props.get("city")
        or props.get("is_in:city")
        or None
    )
    state = (
        props.get("addr:state")
        or props.get("is_in:state_code")
        or props.get("is_in:state")
        or None
    )
    agency = props.get("operator") or None
    return city, state, agency


def load_features(path: str) -> list:
    print(f"[FLOCK Import] Loading {path} ...")
    with open(path) as f:
        data = json.load(f)
    features = data.get("features", [])
    print(f"[FLOCK Import] Loaded {len(features)} features")
    return features


def build_rows(features: list) -> list[tuple]:
    rows = []
    skipped = 0
    for feat in features:
        geom = feat.get("geometry") or {}
        if geom.get("type") != "Point":
            skipped += 1
            continue
        coords = geom.get("coordinates", [])
        if len(coords) < 2:
            skipped += 1
            continue
        lon, lat = coords[0], coords[1]
        if lat is None or lon is None:
            skipped += 1
            continue
        props = feat.get("properties") or {}
        source_id = str(props.get("osm_id") or props.get("id") or props.get("ref") or "")
        camera_type = props.get("camera:type") or props.get("surveillance:type") or None
        city, state, agency = extract_location(props)
        rows.append((lat, lon, source_id or None, camera_type, city, state, agency))
    if skipped:
        print(f"[FLOCK Import] Skipped {skipped} non-Point or invalid features")
    return rows


def run_import(rows: list[tuple], dry_run: bool) -> int:
    if dry_run:
        print(f"[FLOCK Import] DRY RUN — first 5 rows:")
        for r in rows[:5]:
            lat, lon, source_id, camera_type, city, state, agency = r
            print(f"  lat={lat} lon={lon} source_id={source_id!r} camera_type={camera_type!r} city={city!r} state={state!r} agency={agency!r}")
        return 0

    import psycopg2  # type: ignore

    conn = psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=int(os.environ.get("DB_PORT", 5432)),
        dbname=os.environ.get("DB_NAME", "shadowcheck_db"),
        user=os.environ.get("DB_USER", "shadowcheck_admin"),
        password=os.environ.get("DB_PASSWORD", ""),
    )

    inserted = 0
    total = len(rows)
    try:
        with conn:
            with conn.cursor() as cur:
                for i in range(0, total, BATCH_SIZE):
                    batch = rows[i : i + BATCH_SIZE]
                    for lat, lon, source_id, camera_type, city, state, agency in batch:
                        cur.execute(
                            """
                            INSERT INTO app.deflock_cameras
                              (lat, lon, source_id, camera_type, city, state, agency, source)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (lat, lon) DO NOTHING
                            """,
                            (lat, lon, source_id, camera_type, city, state, agency, SOURCE),
                        )
                        inserted += cur.rowcount
                    done = min(i + BATCH_SIZE, total)
                    if done % 5000 < BATCH_SIZE or done == total:
                        print(f"[FLOCK Import] Progress: {done}/{total} processed, {inserted} inserted")
    finally:
        conn.close()

    return inserted


def main():
    parser = argparse.ArgumentParser(description="Import FLOCK repo camera GeoJSON into app.deflock_cameras")
    parser.add_argument("--dry-run", action="store_true", help="Print first 5 rows, skip insert")
    parser.add_argument("--input", default=GEOJSON_PATH, help="Path to GeoJSON file")
    args = parser.parse_args()

    features = load_features(args.input)
    rows = build_rows(features)
    print(f"[FLOCK Import] {len(rows)} valid rows to import")

    inserted = run_import(rows, dry_run=args.dry_run)

    if not args.dry_run:
        print(f"[FLOCK Import] Done. Inserted {inserted} new rows into app.deflock_cameras")


if __name__ == "__main__":
    main()

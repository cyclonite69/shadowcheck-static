#!/usr/bin/env python3
"""
Import Flock Safety ALPR camera locations from OpenStreetMap via Overpass API
into app.deflock_cameras. This is the same primary data source used by DeFlock.

Idempotent: ON CONFLICT on (lat, lon) DO NOTHING.

Usage (run on EC2 via SSM):
  export DB_HOST=localhost DB_PORT=5432 DB_NAME=shadowcheck_db
  export DB_USER=shadowcheck_admin DB_PASSWORD=<secret>
  python3 /home/ssm-user/shadowcheck/scripts/import_deflock.py

  # Or US-only bounding box:
  python3 scripts/import_deflock.py --bbox 24.4,-125.0,49.4,-66.9

  # Dry run (print rows, don't insert):
  python3 scripts/import_deflock.py --dry-run
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.parse
import urllib.error

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# OSM tags known to identify Flock Safety ALPR cameras
OVERPASS_QUERY_TEMPLATE = """
[out:json][timeout:60];
(
  node["man_made"="surveillance"]["operator"~"Flock",i]{bbox};
  node["man_made"="surveillance"]["brand"~"Flock",i]{bbox};
  node["surveillance:type"="ALPR"]["operator"~"Flock",i]{bbox};
  node["camera:type"="ALPR"]["operator"~"Flock",i]{bbox};
);
out body;
"""

US_BBOX = "(24.4,-125.0,49.4,-66.9)"


def build_query(bbox_str: str) -> str:
    return OVERPASS_QUERY_TEMPLATE.replace("{bbox}", bbox_str)


def fetch_overpass(query: str) -> list:
    data = urllib.parse.urlencode({"data": query}).encode()
    req = urllib.request.Request(
        OVERPASS_URL,
        data=data,
        headers={"User-Agent": "ShadowCheck/1.0 (+https://github.com/cyclonite69/shadowcheck-web)"},
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            result = json.loads(resp.read())
            return result.get("elements", [])
    except urllib.error.HTTPError as e:
        print(f"[ERROR] Overpass HTTP {e.code}: {e.reason}", file=sys.stderr)
        raise
    except urllib.error.URLError as e:
        print(f"[ERROR] Overpass connection failed: {e.reason}", file=sys.stderr)
        raise


def extract_location(tags: dict) -> tuple[str | None, str | None]:
    city = (
        tags.get("addr:city")
        or tags.get("city")
        or tags.get("is_in:city")
        or None
    )
    state = (
        tags.get("addr:state")
        or tags.get("is_in:state_code")
        or tags.get("is_in:state")
        or None
    )
    return city, state


def insert_cameras(elements: list, dry_run: bool) -> int:
    if dry_run:
        for el in elements:
            lat, lon = el.get("lat"), el.get("lon")
            tags = el.get("tags", {})
            city, state = extract_location(tags)
            print(f"  lat={lat:.6f} lon={lon:.6f} city={city} state={state}")
        return len(elements)

    import psycopg2  # type: ignore

    conn = psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=int(os.environ.get("DB_PORT", 5432)),
        dbname=os.environ.get("DB_NAME", "shadowcheck_db"),
        user=os.environ.get("DB_USER", "shadowcheck_admin"),
        password=os.environ.get("DB_PASSWORD", ""),
    )

    inserted = 0
    try:
        with conn:
            with conn.cursor() as cur:
                for el in elements:
                    lat = el.get("lat")
                    lon = el.get("lon")
                    if lat is None or lon is None:
                        continue
                    tags = el.get("tags", {})
                    city, state = extract_location(tags)
                    cur.execute(
                        """
                        INSERT INTO app.deflock_cameras (lat, lon, city, state, source)
                        VALUES (%s, %s, %s, %s, 'openstreetmap')
                        ON CONFLICT (lat, lon) DO NOTHING
                        """,
                        (lat, lon, city, state),
                    )
                    inserted += cur.rowcount
    finally:
        conn.close()

    return inserted


def main():
    parser = argparse.ArgumentParser(description="Import Flock Safety ALPR cameras from OSM")
    parser.add_argument(
        "--bbox",
        default=US_BBOX,
        help="Overpass bounding box as (south,west,north,east), default US extent",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print rows without inserting into database",
    )
    args = parser.parse_args()

    bbox = f"({args.bbox})" if not args.bbox.startswith("(") else args.bbox
    print(f"[DeFlock Import] Querying Overpass API bbox={bbox} ...")
    t0 = time.time()

    elements = fetch_overpass(build_query(bbox))
    elapsed = time.time() - t0
    print(f"[DeFlock Import] Fetched {len(elements)} nodes in {elapsed:.1f}s")

    if not elements:
        print("[DeFlock Import] No cameras found — check tags or bbox.")
        return

    if args.dry_run:
        print("[DeFlock Import] DRY RUN — rows that would be inserted:")

    inserted = insert_cameras(elements, dry_run=args.dry_run)

    if not args.dry_run:
        print(f"[DeFlock Import] Inserted {inserted} new rows into app.deflock_cameras")


if __name__ == "__main__":
    main()

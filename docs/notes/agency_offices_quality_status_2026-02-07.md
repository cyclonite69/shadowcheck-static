# Agency Offices Quality Status (2026-02-07)

This is a snapshot of current data quality for FBI offices in `app.agency_offices`, plus coverage-note data moved into `app.agency_office_coverage_notes`.

## Baseline Completeness (Real Offices)

All real FBI offices have street address + ZIP + phone populated.

## Enrichment Coverage

### ZIP+4

- Field offices ZIP+4 (raw `postal_code`): **56 / 56**

- Resident agencies ZIP+4 (raw `postal_code`): **312 / 334**
- Resident agencies still ZIP5-only: **22**

Smarty US Street API is used with `match=enhanced` and up to 3 candidates per input. Some remaining rows still only return ZIP5 (no `plus4_code`), so ZIP+4 cannot be populated yet.

### Websites

- Resident agencies missing website: **0**

### Coordinates

- Resident agencies missing coordinates: **0**

Forward geocoding via Nominatim + Mapbox + targeted Smarty correction eliminated the remaining missing coordinates for resident agencies (0 remaining).

## Coverage Notes

Coverage/jurisdiction placeholders are stored in `app.agency_office_coverage_notes`:

- Notes rows: **14**
- All notes are attached to a field office (`field_office_id` not null).

## Known Provider Behaviors

- Smarty US Street API matches some addresses and returns ZIP+4 + coords.
- For some addresses, Smarty returns candidates but without `plus4_code` (ZIP+4 not available from the API response), leaving `postal_code` at ZIP5.
- Nominatim forward-geocode improves coordinates but may return no match for some addresses.

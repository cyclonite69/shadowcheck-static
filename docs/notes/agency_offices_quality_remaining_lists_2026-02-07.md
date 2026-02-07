# Agency Offices Remaining Quality Gaps (2026-02-07)

This is a concrete list of remaining "quality upgrades" that are still pending after automated enrichment.

## Resident Agencies Still ZIP5-Only (Need ZIP+4)

These have `postal_code` still as 5 digits.

```sql
SELECT id,name,city,state,address_line1,address_line2,postal_code,phone,source_url
FROM app.agency_offices
WHERE agency='FBI'
  AND office_type='resident_agency'
  AND postal_code ~ '^[0-9]{5}$'
ORDER BY state,city,name;
```

## Field Offices Still ZIP5-Only (Need ZIP+4)

(As of 2026-02-07 this should be 0, but this query is kept as a regression check.)

```sql
SELECT id,name,city,state,address_line1,address_line2,postal_code,phone,source_url
FROM app.agency_offices
WHERE agency='FBI'
  AND office_type='field_office'
  AND postal_code ~ '^[0-9]{5}$'
ORDER BY state,city,name;
```

## Resident Agencies Missing Coordinates

These have null `latitude/longitude/location` after Smarty and Nominatim.

```sql
SELECT id,name,city,state,address_line1,address_line2,postal_code,phone,source_url
FROM app.agency_offices
WHERE agency='FBI'
  AND office_type='resident_agency'
  AND (latitude IS NULL OR longitude IS NULL OR location IS NULL)
ORDER BY state,city,name;
```

## ZIP+4 Suggestions With ZIP5 Mismatch (Needs Manual Review)

These are cases where an enrichment provider suggested a ZIP+4 whose ZIP5 does not match the stored ZIP5.
We do not auto-apply these.

```sql
SELECT id,name,city,state,postal_code,normalized_postal_code,address_validation_metadata
FROM app.agency_offices
WHERE agency='FBI'
  AND office_type='resident_agency'
  AND (address_validation_metadata ? 'zip4_suggested')
ORDER BY state,city,name;
```

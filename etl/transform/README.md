# ETL Transform Scripts

Data transformation and normalization scripts.

## Scripts

### process-observations.ts

Runs the consolidated observation processing stage.

- Standardizes BSSID format (uppercase)
- Validates coordinates (lat/lon ranges)
- Reports radio type distribution
- Removes duplicates using `(bssid, lat, lon, time)`
- Preserves the highest-signal observation for each duplicate set

### enrich-geocoding.js

Adds reverse geocoding data to observations.

- Uses configured geocoding providers
- Rate-limited API calls
- Caches results in `app.geocoding_cache`

### process-agencies.ts

Adds ZIP+4 to `app.agency_offices.postal_code` using Smarty US Street API.

- Reads Smarty credentials from AWS Secrets Manager (env overrides only)
- Only fills `postal_code` when it is blank or 5-digit
- Optional: can also fill missing `latitude`/`longitude`/`location` if Smarty returns coordinates (`--with-coordinates`)

## Data Flow

```
app.observations (raw)
         ↓
  [process-observations.ts]
         ↓
  app.observations (deduplicated)
         ↓
  [enrich-geocoding.js]
         ↓
  app.observations (geocoded)
```

# WiGLE Import Bug Fix - 2026-02-09

## Root Cause

The table `app.wigle_v2_networks_search` **did not exist** in the database schema, causing all import attempts to fail silently.

## Evidence

1. No CREATE TABLE statement existed for `wigle_v2_networks_search` in any migration file
2. Migration `20260130_consolidate_schema_to_app.sql` attempted to move the table from `public` to `app` schema, but it was never created
3. Code in 5+ files referenced this table but no schema definition existed
4. Import code had incorrect `ON CONFLICT (id)` clause that would never trigger properly

## Changes Made

### 1. Created Missing Table Schema

**File:** `sql/migrations/20260209_create_wigle_v2_networks_search.sql`

- Created table with all 30+ columns matching the INSERT statement
- Added unique constraint on `(bssid, trilat, trilong, lastupdt)` to prevent duplicates
- Added indexes for common queries (bssid, ssid, location, lasttime)
- Added PostGIS geometry column for spatial queries

### 2. Fixed ON CONFLICT Clause

**File:** `server/src/api/routes/v1/wigle.ts` (line ~576)

**Before:**

```sql
ON CONFLICT (id) DO NOTHING
```

**After:**

```sql
ON CONFLICT (bssid, trilat, trilong, lastupdt) DO NOTHING
```

The `id` column is a SERIAL primary key that auto-increments, so conflicts on it would never occur. The fix targets the actual unique constraint.

### 3. Added Debug Logging

**File:** `server/src/api/routes/v1/wigle.ts` (lines ~551-610)

- Capture `result.rowCount` from INSERT query
- Only increment `importedCount` when `rowCount > 0`
- Log errors with BSSID for debugging
- Enhanced final log message to show new vs duplicate/skipped records

## Testing Steps

1. **Apply the migration:**

   ```bash
   psql -U shadowcheck_admin -d shadowcheck_db -f sql/migrations/20260209_create_wigle_v2_networks_search.sql
   ```

2. **Verify table exists:**

   ```sql
   \d app.wigle_v2_networks_search
   ```

3. **Restart the server:**

   ```bash
   npm run dev
   ```

4. **Test with small import (10-20 records):**
   - Use WiGLE search endpoint with `import=true`
   - Check server logs for: `[WiGLE] Import complete: X new records, Y duplicates/skipped`
   - Verify DB has new rows: `SELECT COUNT(*) FROM app.wigle_v2_networks_search;`

5. **Test with larger import (50+ records):**
   - Confirm rowCount matches expected new records
   - Re-run same search to verify duplicates are properly skipped

## Expected Behavior After Fix

- **First import:** `importedCount` should equal number of unique records returned by API
- **Subsequent imports:** `importedCount` should be 0 (all duplicates skipped)
- **Server logs:** Clear indication of new vs skipped records
- **Database:** Rows actually inserted and queryable

## Related Files

- `server/src/api/routes/v1/wigle.ts` - Import endpoint logic
- `server/src/services/wigleImportService.ts` - May need similar fix
- `etl/load/json-import.ts` - May need similar fix
- `sql/migrations/20260130_consolidate_schema_to_app.sql` - Schema consolidation (now valid)

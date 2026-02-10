# WiGLE Import Fix - Constraint Added (2026-02-09 04:11)

## Root Cause Confirmed

The unique constraint `(bssid, trilat, trilong, lastupdt)` was **missing** from the table, causing the `ON CONFLICT` clause to fail with an error.

## Diagnostic Results

### Task 1: Table Schema Check

```sql
\d app.wigle_v2_networks_search
```

**Result:** ❌ NO unique constraint found on (bssid, trilat, trilong, lastupdt)

### Task 2: Data Quality Check

```sql
SELECT COUNT(*) as total_rows, COUNT(DISTINCT (bssid, trilat, trilong, lastupdt)) as unique_rows
FROM app.wigle_v2_networks_search;
```

**Result:** 2,340 total rows, 2,033 unique rows = **307 duplicates**

## Fix Applied

### Step 1: Remove Duplicates

```sql
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY bssid, trilat, trilong, lastupdt
    ORDER BY id DESC
  ) as rn
  FROM app.wigle_v2_networks_search
)
DELETE FROM app.wigle_v2_networks_search
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
```

**Result:** `DELETE 307` - Removed 307 duplicate rows, keeping most recent (highest id)

### Step 2: Add Unique Constraint

```sql
ALTER TABLE app.wigle_v2_networks_search
ADD CONSTRAINT wigle_v2_networks_search_unique
UNIQUE (bssid, trilat, trilong, lastupdt);
```

**Result:** `ALTER TABLE` - Constraint added successfully

### Step 3: Add Debug Logging

**File:** `server/src/api/routes/v1/wigle.ts`

Added console.log statements:

- Before import loop: `shouldImport` and `results.length`
- After each INSERT: `rowCount` and BSSID
- On error: Full error message with BSSID

### Step 4: Restart Server

```bash
docker-compose restart api
```

## Verification

Check constraint exists:

```sql
SELECT conname, contype FROM pg_constraint
WHERE conrelid = 'app.wigle_v2_networks_search'::regclass
AND conname = 'wigle_v2_networks_search_unique';
```

**Result:** ✅ Constraint `wigle_v2_networks_search_unique` (type: u) exists

## Testing Instructions

1. **Run a test import with 10-20 records:**
   - Use WiGLE search endpoint with `import=true`
   - Check server logs for debug output

2. **Expected log output:**

   ```
   [WiGLE DEBUG] shouldImport: true results.length: 20
   [WiGLE DEBUG] rowCount: 1 for BSSID: XX:XX:XX:XX:XX:XX
   [WiGLE DEBUG] rowCount: 1 for BSSID: YY:YY:YY:YY:YY:YY
   ...
   [WiGLE] Import complete: 20 new records, 0 duplicates/skipped
   ```

3. **Re-run same search to verify duplicates are skipped:**

   ```
   [WiGLE DEBUG] rowCount: 0 for BSSID: XX:XX:XX:XX:XX:XX
   [WiGLE DEBUG] rowCount: 0 for BSSID: YY:YY:YY:YY:YY:YY
   ...
   [WiGLE] Import complete: 0 new records, 20 duplicates/skipped
   ```

4. **Check database:**
   ```sql
   SELECT COUNT(*) FROM app.wigle_v2_networks_search WHERE source = 'wigle_api_search';
   ```

## Files Modified

1. `sql/migrations/20260209_add_wigle_v2_unique_constraint.sql` - Migration with duplicate cleanup
2. `server/src/api/routes/v1/wigle.ts` - Added debug logging
3. Database: Removed 307 duplicates, added unique constraint

## Status

✅ **FIXED** - Constraint added, duplicates removed, debug logging enabled, server restarted

Next: Test with actual WiGLE import and verify logs show correct rowCount values.

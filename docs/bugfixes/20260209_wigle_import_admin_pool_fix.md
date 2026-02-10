# WiGLE Import Fix - Admin Pool Issue (2026-02-09 04:38)

## Root Cause: Missing Admin Database Pool

The import was failing because the code used `adminQuery()` which requires `DB_ADMIN_PASSWORD` environment variable, but it was not configured.

## Error Evidence

Server logs showed:

```
[WiGLE] Import error for XX:XX:XX:XX:XX:XX: Admin database pool not initialized (check DB_ADMIN_PASSWORD)
```

All 100 records failed with this error, resulting in 0 imports.

## Why This Happened

1. The WiGLE import endpoint uses `adminQuery()` for database writes
2. `adminQuery()` requires `DB_ADMIN_PASSWORD` to be set in environment
3. The `.env` file only had `DB_PASSWORD` (for regular user), not `DB_ADMIN_PASSWORD`
4. The admin pool initialization failed silently, causing all imports to fail

## Solution

Since the table `app.wigle_v2_networks_search` is owned by `shadowcheck_user` (not admin), we can use the regular `query()` function instead.

### Change Made

**File:** `server/src/api/routes/v1/wigle.ts` (line 556)

**Before:**

```typescript
const result = await adminQuery(
```

**After:**

```typescript
const result = await query(
```

## Why This Works

- Table owner: `shadowcheck_user` (verified via `SELECT tableowner FROM pg_tables`)
- Regular user has INSERT permissions on their own tables
- No need for elevated admin privileges for this operation
- Simpler and more secure (principle of least privilege)

## Testing

After fix applied:

1. Rebuilt application: `npm run build`
2. Restarted server: `docker-compose restart api`
3. Server started successfully with regular DB pool
4. Ready for import test

## Next Steps

**Test the import:**

1. Use WiGLE search with `import=true`
2. Check logs for: `[WiGLE DEBUG] rowCount: 1 for BSSID: XX:XX:XX:XX:XX:XX`
3. Verify: `[WiGLE] Import complete: X new records, Y duplicates/skipped`
4. Confirm DB has new rows: `SELECT COUNT(*) FROM app.wigle_v2_networks_search WHERE source = 'wigle_api_search';`

## Related Issues Fixed

1. ✅ Missing table schema (created in previous fix)
2. ✅ Missing unique constraint (added in previous fix)
3. ✅ Duplicate data cleanup (307 rows removed)
4. ✅ Admin pool requirement (changed to regular query)

## Files Modified

- `server/src/api/routes/v1/wigle.ts` - Changed `adminQuery()` to `query()`

## Status

✅ **READY FOR TESTING** - All blockers removed, imports should now work correctly.

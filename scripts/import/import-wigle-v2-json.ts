#!/usr/bin/env tsx
/**
 * @deprecated This script has been moved to etl/load/json-import.ts
 * This wrapper maintains backwards compatibility.
 */

console.warn(
  '⚠️  DEPRECATION WARNING: scripts/import/import-wigle-v2-json.ts has moved to etl/load/json-import.ts'
);
console.warn('   Please update your scripts to use the new location.\n');

// Forward to new location
import '../../etl/load/json-import';

#!/usr/bin/env tsx
/**
 * @deprecated This script has been moved to etl/load/sqlite-import.ts
 * This wrapper maintains backwards compatibility.
 */

console.warn(
  '⚠️  DEPRECATION WARNING: scripts/import/turbo-import.ts has moved to etl/load/sqlite-import.ts'
);
console.warn('   Please update your scripts to use the new location.\n');

// Forward to new location
import '../../etl/load/sqlite-import';

#!/usr/bin/env node
/**
 * @deprecated This script has been moved to etl/load/json-import.js
 * This wrapper maintains backwards compatibility.
 */

console.warn(
  '⚠️  DEPRECATION WARNING: scripts/import/import-wigle-v2-json.js has moved to etl/load/json-import.js'
);
console.warn('   Please update your scripts to use the new location.\n');

// Forward to new location
require('../../etl/load/json-import');

#!/usr/bin/env tsx

import { normalizePhones } from './process-agencies';

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run') || !process.argv.includes('--live');
  normalizePhones({ dryRun }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { normalizePhones };

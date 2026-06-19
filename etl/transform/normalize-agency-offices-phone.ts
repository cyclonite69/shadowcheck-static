#!/usr/bin/env tsx

import { normalizePhones } from './process-agencies';

export async function main(isMain = require.main === module, args = process.argv) {
  if (isMain) {
    const dryRun = args.includes('--dry-run') || !args.includes('--live');
    try {
      await normalizePhones({ dryRun });
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}

main();

export { normalizePhones };

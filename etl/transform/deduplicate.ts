#!/usr/bin/env tsx

import { deduplicateObservations } from './process-observations';

export async function main(isMain = require.main === module) {
  if (isMain) {
    try {
      await deduplicateObservations();
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}

main();

export { deduplicateObservations };

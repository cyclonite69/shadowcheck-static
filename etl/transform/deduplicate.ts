#!/usr/bin/env tsx

import { deduplicateObservations } from './process-observations';

if (require.main === module) {
  deduplicateObservations().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { deduplicateObservations };

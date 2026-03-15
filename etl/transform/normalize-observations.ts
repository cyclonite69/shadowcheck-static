#!/usr/bin/env tsx

import { normalizeObservations } from './process-observations';

if (require.main === module) {
  normalizeObservations().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { normalizeObservations };

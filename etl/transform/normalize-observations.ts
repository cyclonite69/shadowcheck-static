#!/usr/bin/env tsx

import { normalizeObservations } from './process-observations';

export async function main(isMain = require.main === module) {
  if (isMain) {
    try {
      await normalizeObservations();
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}

main();

export { normalizeObservations };

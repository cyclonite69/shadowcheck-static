#!/usr/bin/env tsx

import { runScoring } from './process-promotion';

if (require.main === module) {
  runScoring().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { runScoring };

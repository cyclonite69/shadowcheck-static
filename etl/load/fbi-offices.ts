#!/usr/bin/env tsx

import { main } from './fbi-locations';

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { main };

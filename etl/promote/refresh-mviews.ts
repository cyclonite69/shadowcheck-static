#!/usr/bin/env tsx

import { refreshMaterializedViews } from './process-promotion';

if (require.main === module) {
  refreshMaterializedViews().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { refreshMaterializedViews };

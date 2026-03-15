#!/usr/bin/env tsx

import { validateData } from './process-promotion';

if (require.main === module) {
  validateData()
    .then((valid) => {
      if (!valid) {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { validateData };

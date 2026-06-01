import { join } from 'path';
import type { RequestHandler } from 'express';

/**
 * Creates an SPA fallback handler for React Router apps.
 */
function createSpaFallback(distDir: string): RequestHandler {
  return (req, res) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/demo') ||
      req.path.startsWith('/analytics-public') ||
      req.path.startsWith('/vendor-docs')
    ) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.sendFile(join(distDir, 'index.html'));
  };
}

export { createSpaFallback };

/**
 * Static asset middleware.
 */
import type { Express, Response } from 'express';
import express from 'express';
import path from 'path';

/**
 * Mount static asset handlers for the built frontend.
 */
function mountStaticAssets(app: Express, distDir: string): void {
  // Serve hashed assets with long cache (1 year, immutable)
  // Vite generates unique hashes in filenames, so aggressive caching is safe
  app.use(
    '/assets',
    express.static(path.join(distDir, 'assets'), {
      maxAge: '1y',
      immutable: true,
      etag: false, // Not needed with immutable + hashed filenames
    })
  );

  // Serve vendor intelligence reference documents (HTML/PDF) from docs/references/vendor_docs/
  // Mounted at /vendor-docs/ — kept out of the build artifact intentionally.
  // Uses process.cwd() (not __dirname) because __dirname resolves to the compiled output path
  // (dist/server/server/src/middleware/) making relative traversal error-prone. The server is
  // always started from the project root (Docker WORKDIR /app, npm start), so cwd() is stable.
  const vendorDocsPath = path.resolve(process.cwd(), 'docs/references/vendor_docs');
  app.use(
    '/vendor-docs',
    express.static(vendorDocsPath, {
      maxAge: '1d',
      etag: true,
    })
  );

  // Serve other static files with short cache (index.html, favicon, etc.)
  app.use(
    express.static(distDir, {
      maxAge: 0, // No cache for index.html (allows instant updates)
      etag: true,
      setHeaders: (res: Response, filePath: string) => {
        // Ensure index.html is never cached
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      },
    })
  );
}

export { mountStaticAssets };

/**
 * vendor-docs-extract.ts
 *
 * Extracts clean article content from raw scraped vendor HTML files using
 * @mozilla/readability + jsdom. Outputs dark-themed HTML to extracted/ subdir.
 *
 * Usage: npx ts-node scripts/vendor-docs-extract.ts
 */

import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

const INPUT_DIR = path.resolve(__dirname, '../docs/references/vendor_docs');
const OUTPUT_DIR = path.join(INPUT_DIR, 'extracted');

const WRAPPER_CSS = `
  body {
    background: #0f172a;
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
    font-size: 14px;
    line-height: 1.7;
    max-width: 760px;
    margin: 0 auto;
    padding: 24px 20px 48px;
  }
  h1, h2, h3, h4, h5, h6 {
    color: #f1f5f9;
    line-height: 1.3;
    margin-top: 1.6em;
    margin-bottom: 0.5em;
  }
  h1 { font-size: 1.5em; }
  h2 { font-size: 1.25em; }
  h3 { font-size: 1.1em; }
  a { color: #60a5fa; text-decoration: none; }
  a:hover { text-decoration: underline; }
  p { margin: 0 0 1em; }
  img { max-width: 100%; height: auto; border-radius: 4px; opacity: 0.9; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  th, td { border: 1px solid #334155; padding: 6px 10px; text-align: left; }
  th { background: #1e293b; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  blockquote { border-left: 3px solid #334155; margin: 1em 0; padding: 0 0 0 16px; color: #94a3b8; }
  code, pre { background: #1e293b; border-radius: 4px; font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 12px; }
  code { padding: 1px 5px; }
  pre { padding: 12px; overflow-x: auto; }
  hr { border: none; border-top: 1px solid #1e293b; margin: 2em 0; }
`.trim();

function wrapContent(title: string, byline: string | null, content: string): string {
  const meta = byline
    ? `<p style="color:#64748b;font-size:12px;margin:0 0 1.5em">${byline}</p>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>${WRAPPER_CSS}</style>
</head>
<body>
<h1>${title}</h1>
${meta}
${content}
</body>
</html>`;
}

function stubContent(filename: string, reason: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Extraction Failed — ${filename}</title>
<style>${WRAPPER_CSS}</style>
</head>
<body>
<h1 style="color:#f87171">Extraction Failed</h1>
<p style="color:#94a3b8">File: <code>${filename}</code></p>
<p style="color:#94a3b8">Reason: ${reason}</p>
</body>
</html>`;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const files = fs.readdirSync(INPUT_DIR).filter((f) => f.endsWith('.html'));
  console.log(`Processing ${files.length} HTML files...\n`);

  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const inputPath = path.join(INPUT_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file);

    try {
      const html = fs.readFileSync(inputPath, 'utf-8');
      const dom = new JSDOM(html, { url: 'https://example.com' });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article || !article.content || article.content.trim().length < 100) {
        const reason = article
          ? 'Extracted content too short (< 100 chars)'
          : 'Readability returned null';
        fs.writeFileSync(outputPath, stubContent(file, reason), 'utf-8');
        console.log(`  FAIL  ${file} — ${reason}`);
        failed++;
      } else {
        const out = wrapContent(article.title || file, article.byline ?? null, article.content);
        fs.writeFileSync(outputPath, out, 'utf-8');
        console.log(`  OK    ${file} — "${article.title}" (${article.content.length} chars)`);
        passed++;
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      fs.writeFileSync(outputPath, stubContent(file, reason), 'utf-8');
      console.log(`  ERR   ${file} — ${reason}`);
      failed++;
    }
  }

  console.log(`\nDone: ${passed} succeeded, ${failed} failed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

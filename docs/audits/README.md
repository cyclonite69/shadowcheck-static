# Architecture Audit Reports

This directory contains historical and generated modularity, cruft, and refactor-planning reports.

## Commands

```bash
npm run audit:cruft
npm run audit:modularity
npm run audit:architecture
npm run audit:roadmap
```

Each command scans the repository and writes a dated Markdown file in this directory. Use `--stdout` to preview without writing:

```bash
npx tsx scripts/audit/cruft-audit.ts --stdout
npx tsx scripts/audit/modularity-audit.ts --stdout --top 25
```

## Contracts

- Audit scripts are static and source-read-only. Their only permitted repository write is the requested Markdown report under `docs/audits/`.
- Reports never authorize deletion or refactoring. Findings are candidates with explicit evidence and confidence.
- `policy:modularity` remains the cheap pass/fail threshold gate. Narrative modularity audits add role, coupling, and responsibility signals without changing that policy.
- Cruft checks are mechanical and conservative: dynamic registration, runtime loading, deployment references, and focused tests must be checked before removal.
- Roadmaps use this order: characterization tests, pure extraction, side-effect isolation, SQL splitting, then explicitly approved cruft removal.

## Output Names

- `YYYY-MM-DD-cruft-audit.md`
- `YYYY-MM-DD-modularity-audit.md`
- `YYYY-MM-DD-architecture-audit.md`
- `YYYY-MM-DD-architecture-roadmap.md`

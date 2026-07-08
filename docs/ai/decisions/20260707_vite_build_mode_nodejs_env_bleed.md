# ADR 20260707 — Vite build-mode bleed from `NODE_ENV=development` in shared-builder

**Date:** 2026-07-07  
**Status:** Accepted — fix applied and confirmed by rebuilt artifact  
**Discovered by:** Session close-out audit while restoring the production frontend after e2e testing

---

## Context

The `Dockerfile` uses a single `shared-builder` stage that compiles both the frontend (Vite)
and backend (TypeScript) in one pass. To ensure `npm ci` installs devDependencies (required
for both builds), the stage sets:

```dockerfile
ENV NODE_ENV=development
```

This is correct for npm's purposes. The problem is that Vite also reads `NODE_ENV` to determine
its build mode when no explicit `--mode` flag is passed.

### How Vite resolves `import.meta.env.DEV`

Vite's `import.meta.env.DEV` is **not** determined by the `--mode` flag. It is determined
by `process.env.NODE_ENV` in the Vite process itself at build time. From Vite 8's source
(`node_modules/vite/dist/node/chunks/node.js`):

```javascript
const isProduction = process.env.NODE_ENV === 'production';
```

`isProduction` controls the `DEV` and `PROD` values baked into the bundle.

`--mode production` sets `import.meta.env.MODE = "production"` and loads `.env.production`
files, but it does **not** set `process.env.NODE_ENV = "production"` in the Vite process.
These are independent concerns.

The result: when the Vite process runs with `NODE_ENV=development` in its environment
(as the `shared-builder` stage does), `import.meta.env.DEV` is `true` in the compiled
output regardless of what `--mode` flag is passed.

This was verified directly by adding a probe to `mapHandlers.ts`:

```typescript
console.log('[ENV_PROBE]', {
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  MODE: import.meta.env.MODE,
});
```

Two builds, different `NODE_ENV`, identical `--mode production`:

| Build command                                       | Compiled output                                |
| --------------------------------------------------- | ---------------------------------------------- |
| `NODE_ENV=development vite build --mode production` | `{DEV: true, PROD: false, MODE: "production"}` |
| `NODE_ENV=production vite build --mode production`  | `{DEV: false, PROD: true, MODE: "production"}` |

The second build also correctly eliminated the `window.__wigleHandleUnclustered` assignment
from the bundle. The first did not.

---

## What was affected

### 1. `client/src/components/wigle/mapHandlers.ts` — E2E test seam unconditionally exposed

```typescript
// Gate intended to strip the seam from production builds
if (import.meta.env.DEV || import.meta.env.VITE_E2E) {
  (window as any).__wigleHandleUnclustered = handleUnclustered;
}
```

With `DEV=true`, Vite collapsed `true || false` to unconditional. The `if` block was
eliminated and the assignment became a bare statement in every production Docker build:

```javascript
// Minified output (production container) — NO guard, NO if()
window.__wigleHandleUnclustered = i;
```

`window.__wigleHandleUnclustered` has been exposed on the global window object in every
production frontend build produced from this Dockerfile.

### 2. `client/src/logging/clientLogger.ts` — info logs firing in production

```typescript
const isDev = import.meta.env.DEV;

function shouldLog(level: LogLevel) {
  if (levelOrder[level] < minLevel) return false;
  if (!isDev && (level === 'debug' || level === 'info')) return false; // ← suppressed in prod
  return true;
}
```

With `isDev=true`, the second guard (`!true && ...`) evaluated to `false` unconditionally
and was eliminated as dead code. Result: `logInfo()` calls fired in the production bundle.

Expected production behavior (with `DEV=false`): `info` logs are suppressed; only `warn`
and `error` reach the console.

Note: `debug` logs were already suppressed regardless of `DEV` — the first guard
(`levelOrder['debug']=0 < minLevel=1`) catches them before reaching the `isDev` check.

### 3. `siblingTopologyDebug.ts` and `NetworkExplorerSection.tsx` — not affected

Both use a double gate:

```typescript
import.meta.env.DEV && import.meta.env.VITE_SIBLING_TOPOLOGY_DEBUG === 'true';
import.meta.env.DEV && import.meta.env.VITE_SIBLING_DEBUG === 'true';
```

The second operand (`=== 'true'`) evaluated to `false` because neither env var is set by
default. The overall expression collapsed to `true && false = false`, so these debug paths
were correctly disabled in production despite `DEV=true`.

---

## Verification methodology

The investigation found compelling evidence that the frontend production bundle was built with
`import.meta.env.DEV === true`, likely because the shared builder invoked Vite without an
explicit `--mode production` while `NODE_ENV=development` was set. The subsequent rebuild
with `NODE_ENV=production` serves as the final empirical validation of this hypothesis.

**1. `window.__wigleHandleUnclustered` assignment is unconditional in the WiglePage bundle.**
Inspected 150 characters preceding the assignment — no `if()` guard present. The gate from
source was fully eliminated. Whatever value `DEV` held at build time, the optimizer concluded
the condition was always true and inlined the body unconditionally.

**2. `import.meta.env` does not appear anywhere in any bundle.**
All replacements occurred at build time. This confirms replacements happened correctly; it does
not independently confirm which value was substituted for `DEV`.

**3. Probe build directly observed `DEV=true` with `NODE_ENV=development` in the Vite process.**
A temporary `console.log` of `import.meta.env.DEV/PROD/MODE` was added to `mapHandlers.ts`
and two builds were compared:

| Build command                                       | Compiled output                                |
| --------------------------------------------------- | ---------------------------------------------- |
| `NODE_ENV=development vite build --mode production` | `{DEV: true, PROD: false, MODE: "production"}` |
| `NODE_ENV=production vite build --mode production`  | `{DEV: false, PROD: true, MODE: "production"}` |

The second build also eliminated the `window.__wigleHandleUnclustered` assignment from the
bundle. The first did not.

**Note on methodology:** The probe build directly observes the inlined values, but it runs
outside the Docker shared-builder environment. The rebuild validation step (building the full
Docker `frontend` target with the `NODE_ENV=production` fix applied) is the final empirical
check: if the rebuilt production container bundle no longer contains the unconditional seam
assignment and `DEV` compiles to `false`, the root cause is confirmed and the ADR language
can be updated from "evidence indicates" to "confirmed by rebuilt artifact."

**4. Vite 8 source confirms the mechanism.**
`node_modules/vite/dist/node/chunks/node.js` line ~34582:

```javascript
const isProduction = process.env.NODE_ENV === 'production';
```

`isProduction` controls the `DEV`/`PROD` values baked into the bundle. `--mode production`
sets `MODE` and loads `.env.production` files but does not set `process.env.NODE_ENV`.
These are independent concerns in Vite 8's internals.

---

## Decision

The correct fix is to pass `NODE_ENV=production` to the Vite build invocation. `--mode production`
alone is insufficient — it sets `MODE` but does not affect `import.meta.env.DEV`.

Two equivalent approaches:

**Option A — prefix the npm script with `NODE_ENV=production`:**

```json
// package.json — before
"build:frontend": "vite build --config client/vite.config.ts --outDir ../dist",

// package.json — after
"build:frontend": "NODE_ENV=production vite build --config client/vite.config.ts --outDir ../dist",
```

**Option B — set `NODE_ENV=production` only for the frontend build stage in the Dockerfile,**
keeping `NODE_ENV=development` for the npm install step:

```dockerfile
# After npm ci (which needs NODE_ENV=development for devDependencies):
RUN NODE_ENV=production npm run build:frontend && npm run build:server
```

Option A is preferred: it's a single-file change, is explicit about intent, and means the
fix applies in all build contexts (local, CI, Docker) without Dockerfile changes.

Adding `--mode production` alongside is harmless (ensures `MODE=production` and loads
`.env.production` if it exists) but is not the active ingredient.

### Why not set `NODE_ENV=production` in the Dockerfile globally?

Setting `NODE_ENV=production` before `npm ci` would break devDependency installation —
npm skips devDependencies when `NODE_ENV=production`. The `--include=dev` flag does not
reliably override this in all npm versions. The `NODE_ENV=development` in `shared-builder`
exists for the npm install step. The fix is to scope `NODE_ENV=production` to the Vite
invocation only, not to the entire stage.

---

## Blast radius of the fix

| Location                     | Current behavior (broken)                                 | Fixed behavior                       | Impact                       |
| ---------------------------- | --------------------------------------------------------- | ------------------------------------ | ---------------------------- |
| `mapHandlers.ts`             | `window.__wigleHandleUnclustered` exposed unconditionally | Eliminated from bundle (dead code)   | Seam removed from production |
| `clientLogger.ts`            | `info` logs fire in production console                    | `info` logs suppressed in production | Production console quieter   |
| `siblingTopologyDebug.ts`    | No change (double-gated, already off)                     | No change                            | None                         |
| `NetworkExplorerSection.tsx` | No change (double-gated, already off)                     | No change                            | None                         |

The logger change is a behavioral change that ops/dev users may notice (production browser
console loses `[INFO]` output). This is the intended behavior that has never correctly
applied in Docker builds.

---

## Smoke-test results (2026-07-07)

After rebuilding the frontend container with `NODE_ENV=production` in `build:frontend`:

- [x] All seven routes return 200: `/`, `/dashboard`, `/geospatial-explorer`, `/analytics`, `/wigle`, `/admin`, `/kepler`
- [x] `window.__wigleHandleUnclustered` count in `WiglePage-*.js`: **0** (seam correctly absent)
- [x] `import.meta.env` not present in any bundle chunk (replacements applied at build time)
- [x] Bundle hash changed: `WiglePage-LLbfsXC_.js` → `WiglePage-BhQvlrcK.js` (content differs from broken build)
- [x] Frontend health endpoint: 200

---

## How this bug was introduced

The `shared-builder` pattern predates the `import.meta.env.DEV` gate in `mapHandlers.ts`.
When the e2e seam was added, the gate was tested in the Vite dev server context (where
`DEV=true` is correct) and in the `--mode e2e` Docker build (where `VITE_E2E=true`). The
production Docker path — where `NODE_ENV=development` in the Vite process makes `DEV=true`
regardless of build mode — was not validated because `--mode production` was assumed to be
sufficient to force production semantics.

The critical non-obvious detail is that `--mode` and `NODE_ENV` control two independent
things in Vite 8: `--mode` controls `MODE`, `.env.<mode>` file loading, and `VITE_E2E`-style
user vars; `NODE_ENV` controls `DEV`/`PROD`. They are not aliases for each other.

The discrepancy was found during a frontend restore step after e2e testing, when the
"production" build was inspected and the seam assignment was found to be identical to the
e2e build's output.

---

## Related

- `Dockerfile` line 16: `ENV NODE_ENV=development`
- `package.json` `build:frontend` and `build:e2e` scripts
- `client/src/components/wigle/mapHandlers.ts` — seam gate
- `client/src/logging/clientLogger.ts` — DEV-gated log suppression
- Session note: `docs/ai/sessions/ACTIVE.md` — close-out audit 2026-07-07

# ShadowCheck E2E Tests

Playwright end-to-end tests that run against a live API server (`http://127.0.0.1:3001`).

## Required Environment Variables

| Variable             | Required | Description                                      |
| -------------------- | -------- | ------------------------------------------------ |
| `E2E_ADMIN_PASSWORD` | **Yes**  | Password for the admin account used in test auth |
| `E2E_ADMIN_USER`     | No       | Admin username (default: `admin`)                |

`E2E_ADMIN_PASSWORD` has no fallback value. Tests will throw immediately on missing env var
rather than silently submitting a wrong credential. This is intentional — a hardcoded
fallback password in test code is a gitleaks violation and a credential hygiene problem.

## Setup

```bash
# Option 1: export in your shell before running tests
export E2E_ADMIN_USER=admin
export E2E_ADMIN_PASSWORD=<your-local-admin-password>
npx playwright test

# Option 2: .env.e2e file (never commit this file)
cat > tests/e2e/.env.e2e <<EOF
E2E_ADMIN_USER=admin
E2E_ADMIN_PASSWORD=<your-local-admin-password>
EOF
source tests/e2e/.env.e2e && npx playwright test
```

> `.env.e2e` is in `.gitignore`. Never commit actual credentials.

## Running

```bash
# All E2E tests
npx playwright test

# Single spec file
npx playwright test tests/e2e/filters.dashboard.spec.ts

# With browser UI (headed mode)
npx playwright test --headed

# Show test report after run
npx playwright show-report
```

## Auth Strategy

`global-setup.ts` logs in once before all workers and saves the session cookie to
`tests/e2e/.auth/state.json`. Individual tests reuse this stored state to avoid
hitting the rate limiter (50,000 req/15min per IP) when running in parallel.

The `.auth/` directory is gitignored — it contains session cookies, not source code.

## Gitleaks Policy

Credential values are never hardcoded in E2E test files. The `tests/e2e/` path is
covered by a scoped allowlist in `.gitleaks.toml` to account for test-context patterns,
but actual credentials must always come from env vars. If you see a literal password
value in any file under `tests/e2e/`, treat it as a bug and remove it.

## Mapbox Interaction Tests — Window Seam Pattern

### Why canvas clicks don't work for Mapbox GL JS tests

The naive approach to testing a Mapbox popup is: fly the map to a known coordinate,
wait for points to uncluster, click the canvas. This fails reliably in this project
for two compounding reasons:

1. **`fitBounds` override.** `useWigleDataSync.ts` calls `map.fitBounds(bounds, {maxZoom: 12})`
   every time data loads. Any programmatic `flyTo`/`jumpTo`/`easeTo` fired before or
   immediately after navigation is overridden by this callback. The map always settles
   at zoom ≤ 12, where data points are clustered.

2. **Cluster hit-testing.** At zoom ≤ 12, `queryRenderedFeatures` on the unclustered
   layer returns nothing — all points are inside cluster bubbles. Canvas clicks at computed
   pixel coordinates land on the cluster, not the point, so no popup fires.

Both failure modes produce tests that appear to work under some timing conditions and fail
under others. They are not fixable by adding more `waitForTimeout` calls.

### The standing solution: expose the handler as a window seam

Instead of fighting viewport state, expose the internal click handler directly on `window`
in non-production builds and invoke it from the test with a synthetic event object. This
completely bypasses cluster state, zoom level, viewport animation, and canvas coordinate
mapping.

**What this looks like in the handler file** (`mapHandlers.ts` pattern):

```ts
// After the handler function declaration, before map.on() registrations:
if (import.meta.env.DEV || import.meta.env.VITE_E2E) {
  (window as any).__wigleHandleUnclustered = handleUnclustered;
}
```

**Why `DEV || VITE_E2E`, not just `DEV`:**

- `import.meta.env.DEV` is `true` only in the Vite dev server. It is `false` in any
  `vite build` output, including the Docker nginx container that Playwright targets
  (port 8080 → `shadowcheck_web_frontend`).
- `VITE_E2E=true` is set by `client/.env.e2e`, which Vite loads automatically when
  building with `--mode e2e`. The `frontend-e2e` Docker target uses this mode.
- Production builds (`npm run build` / `frontend` Docker target) set neither flag, so
  the exposure line is dead-code-eliminated by Rolldown/Vite's build-time constant folding.

**Data objects vs. callable actions — gating rationale:**

`__wigleMapInstance` (exposed unconditionally in `useWigleMapInit.ts`) is a data object.
Reading it from devtools can't do anything the user couldn't already do by interacting
with the map. `__wigleHandleUnclustered` is a callable action — invoking it triggers
an API fetch, popup DOM mutation, and drag setup. Intentionally keeping it gated behind
`DEV || VITE_E2E` means it is absent from the production bundle.

### Building and running with the e2e frontend

The e2e frontend target must be used — the production target does not include the seam.

**A note on `NODE_ENV=development` in the build stage:**
`frontend-e2e-builder` (like `shared-builder`) sets `NODE_ENV=development` in the
builder shell. This is required so native-module install scripts (bcrypt, better-sqlite3,
etc.) don't skip their gyp builds when `--include=dev` is passed to `npm ci`.

This does **not** mean the bundle behaves like a development build at runtime. The
load-bearing guarantee is that `vite build` statically replaces all `process.env.NODE_ENV`
references in bundled output with `'production'`, regardless of the ambient shell value —
this is a deliberate Vite behavior because so much of the ecosystem (React, etc.) checks
`process.env.NODE_ENV` directly rather than `import.meta.env`. The shell's
`NODE_ENV=development` never reaches the bundle; React ships in production mode either
way. `import.meta.env.DEV`/`PROD` are set by `--mode`, not by the shell, so the
`VITE_E2E` gate is unaffected.

If this project ever adds a raw esbuild or webpack step that doesn't share Vite's
`process.env.NODE_ENV` replacement behavior, revisit this assumption.

```bash
# Build the e2e frontend image
docker compose -f docker-compose.yml -f docker-compose.e2e.yml build frontend

# Swap the running container to the e2e image
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d frontend

# Verify the seam is present in the built bundle
docker exec shadowcheck_web_frontend \
  grep -rl "__wigleHandleUnclustered" /usr/share/nginx/html/assets/

# Run the spec
E2E_ADMIN_PASSWORD="$(cat /tmp/.e2e_pw)" \
  npx playwright test tests/e2e/wigleTooltipTemporal.spec.ts --reporter=list
```

To restore the production frontend after testing:

```bash
docker compose up -d frontend
```

### Test pattern

```ts
// Wait for the seam to be present (fails fast if you're on the production build)
await page.waitForFunction(() => typeof (window as any).__wigleHandleUnclustered === 'function', {
  timeout: 10000,
});

// Invoke with a synthetic Mapbox-style event object
await page.evaluate(
  ({ lng, lat, bssid }) => {
    (window as any).__wigleHandleUnclustered({
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: { bssid, netid: bssid, ssid: 'TEST', trilat: lat, trilong: lng },
        },
      ],
      lngLat: { lng, lat },
    });
  },
  { lng: -83.696, lat: 43.023, bssid: 'AA:BB:CC:DD:EE:FF' }
);

// Then wait for the enriched popup as normal
const popup = page.locator('.sc-popup');
await expect(popup).toBeVisible({ timeout: 10000 });
```

### Applying this pattern to a new Mapbox handler

1. Add the `if (import.meta.env.DEV || import.meta.env.VITE_E2E)` gate after the
   handler function's closing brace, before any `map.on()` calls.
2. Decide if the handler is a **data object** (expose unconditionally is fine) or a
   **callable action** (use the gate). When in doubt, use the gate.
3. Write the test using `page.waitForFunction` to verify the seam exists, then
   `page.evaluate` to invoke it with a synthetic event.
4. Intercept any API routes the handler calls with `page.route()` before navigating.
5. Do not use `flyTo`, `jumpTo`, canvas clicks, or `waitForFunction` on zoom level.

## Canonical Compose Stack for E2E Runs

**Use `docker-compose.yml` (the base dev stack) as the API source for all E2E runs.**
Do not run `docker compose -f docker-compose.yml -f docker-compose.e2e.yml up` for the
API service — the `.e2e.yml` overlay only overrides the `frontend` service and must
not be used to start a new API container.

### Why this matters — the "wrong password" trap

`docker-compose.e2e.yml` overrides only the `frontend` target, but running it with
`up -d` (without specifying only `frontend`) will recreate **all** services, including
`api`. The newly recreated API container (`shadowcheck_web_api`) boots with no
pre-existing session state. If your `E2E_ADMIN_PASSWORD` was saved against a
long-running `shadowcheck_web_api_dev` container, those sessions are gone and auth
will return 401 — even with the correct password, because the new container hasn't
issued that session token.

This was observed in practice: the `shadowcheck_web_api_dev` container (running for
hours) had existing sessions; the `.e2e.yml up -d` recreated it as
`shadowcheck_web_api`, burning all sessions. The 401 looked like a wrong password
but was actually a missing session in a fresh container.

**Correct procedure:**

```bash
# 1. Ensure the base dev stack is fully up
docker compose -f docker-compose.yml up -d

# 2. Build and swap ONLY the frontend to the e2e image
docker compose -f docker-compose.yml -f docker-compose.e2e.yml build frontend
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d frontend

# 3. Run e2e tests against the dev API (port 3001) + e2e frontend (port 8080)
E2E_ADMIN_PASSWORD="$(cat /tmp/.e2e_pw)" npx playwright test --reporter=list

# 4. Restore production frontend after testing
docker compose -f docker-compose.yml up -d frontend
```

**Never run:**

```bash
# This recreates the API container, losing all sessions
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d
```

### Container inventory during e2e runs

| Container                         | Role                                            | Port |
| --------------------------------- | ----------------------------------------------- | ---- |
| `shadowcheck_web_api` (or `_dev`) | API — **must be the long-running dev instance** | 3001 |
| `shadowcheck_web_frontend`        | Nginx serving the **e2e build**                 | 8080 |
| `shadowcheck_postgres_local`      | Database                                        | 5432 |
| `shadowcheck_web_redis_dev`       | Redis                                           | 6379 |

The `E2E_ADMIN_PASSWORD` in `/tmp/.e2e_pw` is valid only against the **running API
container's database**. If the API container is recreated, global-setup must re-run
against the fresh container (which will have no pre-existing session tokens, but the
DB password is unchanged, so auth will succeed on the next `global-setup` run).

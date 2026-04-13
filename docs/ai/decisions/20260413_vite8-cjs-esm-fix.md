# Decision: Vite 8 Upgrade — CJS/ESM Conflict Fix

**Date:** 2026-04-13  
**Context:** Upgrading from Vite 7 (Rollup) to Vite 8 (Rolldown)

---

## Problem

After upgrading to Vite 8, the browser threw:

```
Uncaught ReferenceError: exports is not defined
    at main.tsx:5:69
    at rolldown-runtime-3kvWqPKU.js:1:214
```

The build succeeded with zero errors. The failure was runtime-only.

## Root Cause

The monorepo root `package.json` declares `"type": "commonjs"` (required by the
Node.js/Express backend). Vite 7 with Rollup tolerated this — it converted CJS
dependencies to ESM transparently. Vite 8 with Rolldown is stricter: it reads the
nearest `package.json` to determine module format and, finding `"type": "commonjs"`,
injected CJS interop shims (`exports` assignments) into the browser bundle. These
shims reference the global `exports` variable, which does not exist in a browser
ESM context.

`client/` had no `package.json` of its own, so Rolldown walked up to the root and
inherited the CommonJS declaration.

## Fix

Three changes, all required together:

**1. `client/package.json` (new file)**

```json
{ "type": "module" }
```

Tells Rolldown that source files under `client/` are ESM, overriding the root.
This is the primary fix.

**2. `client/postcss.config.js` — converted to ESM**

```js
// Before
module.exports = { plugins: { '@tailwindcss/postcss': {}, autoprefixer: {} } };

// After
export default { plugins: { '@tailwindcss/postcss': {}, autoprefixer: {} } };
```

Required because once `client/` is declared ESM, `module.exports` in any file
under it is invalid.

**3. `client/vite.config.ts` — explicit output format**

```ts
output: {
  format: 'es',
  manualChunks(id) { ... }
}
```

Belt-and-suspenders. Redundant with `client/package.json` but makes intent explicit.

## Also Removed

`vite-plugin-pwa@1.2.0` was dropped because it only declares peer support up to
Vite 7 and was not imported or used anywhere in the codebase. Its peer conflict
blocked `npm install` entirely.

## Key Lesson

In a monorepo where the root `package.json` is `"type": "commonjs"` for the
backend, any frontend build tool that reads `package.json` for module type (Rolldown,
and likely future tools) must have a `package.json` in the frontend subdirectory
declaring `"type": "module"`. This is not required by Rollup (Vite 7) but is
required by Rolldown (Vite 8+).

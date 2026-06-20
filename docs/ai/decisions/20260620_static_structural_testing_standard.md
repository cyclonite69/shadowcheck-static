# Decision: Static Structural Testing Standard for WebGL/Canvas UI Elements

**Date:** 2026-06-20

**Context:** During Stage 1 (Role Locks & Characterization Tests) of the modularity refactoring, client-side hooks and components (such as `useGeospatialExplorerState.ts` and `WiglePage.tsx`) were identified as heavy WebGL/Canvas consumers. Setting up full rendering tests in JSDOM leads to extreme flakiness, missing WebGL contexts (causing Mapbox GL JS runtime failures), or requires massive mocking of child components/sub-hooks, reducing the test to a verification of mocks.

---

## 1. Decision: Static Structural Verification

For frontend components and hooks bound to heavy third-party libraries (e.g., Mapbox GL JS, Deck.gl) that are impractical to render under JSDOM:

- **Approach:** Use static file parsing (`fs.readFileSync`) to verify structural composition rather than executing them at runtime.
- **Why:** It avoids WebGL/JSDOM runtime exceptions, runs in under 10ms with zero dependencies, and acts as a strict compile-time safety lock on file integrity.
- **Tradeoff Acknowledgment:** This is a weaker proxy than active integration/execution tests (it checks that the dependencies, inputs, and returned outputs are declared and structured correctly in the source text, rather than confirming active execution logic).

---

## 2. Completeness Requirements

To compensate for the weaker execution proxy, structural checks must be exhaustive:

- **No Spot-Checking:** Assert on **every single returned state property, helper, and handler** individually by name (as done for the 74 returned keys in `useGeospatialExplorerState.test.ts`).
- **Imports Lock:** Assert on the presence of all referenced sub-hooks, utilities, and components in the file import section.
- **Props Wiring:** Assert on JSX child element prop declarations to ensure they map correct parameters (e.g., verifying `onToggleLayer={toggleLayer}` is wired correctly in `WiglePage.test.ts`).

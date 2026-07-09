# WiGLE Client Test Suite Flakiness — Diagnosis & Fix Prompt

**Date Identified**: 2026-07-08 (claude-5bf6564f)  
**Status**: Pending diagnosis + fix (hand off to Kiro or Codex)  
**Severity**: Medium (tests pass overall, but suite is unreliable run-to-run)

## The Problem

Test: `tests/unit/services/wigleClient.test.ts` → `wigleClient (Deterministic Hardening)` → `"background requests get a delay when breaker is open"`

Symptom: The assertion `expect(global.fetch).toHaveBeenCalledTimes(2)` fails with **different actual counts across runs** (observed: 15, 16, 17 calls instead of expected 2).

**Key insight**: A stable logic bug produces a stable wrong number. A drifting number = state is leaking between test cases, not that the logic is simply wrong.

Related symptoms:

- 10-second timeouts on 5 other tests in the same suite
- Failures only appear under specific parallelization/timing conditions
- "Pre-existing" label has caused this to be punted across ~dozen prior sessions

## Root Cause Hypothesis

The module under test (`server/src/services/wigleClient.ts` or wherever `fetchWigle`/circuit-breaker state lives) holds singleton/module-level mutable state that persists across test boundaries:

- Circuit breaker failure counter
- Request deduplication cache
- Retry queue
- In-flight promise map
- Rate-limit window tracker

Earlier tests leave the breaker "open" or queue background retries, and later tests inherit that state, causing:

1. Inflated `fetch` call counts (stacked retries from prior test bleeding in)
2. 10-second timeouts (later tests waiting on retry/backoff timers from a PRIOR test that never got cleaned up)

## Diagnosis Checklist

Hand off to Kiro or Codex with this prompt:

```
Diagnose and fix the flaky wigleClient test suite
(tests/unit/services/wigleClient.test.ts, describe block
"wigleClient (Deterministic Hardening)").
Do NOT just increase timeouts — find the actual root cause first.

SYMPTOM: Across multiple recent test runs, the same assertion
`expect(global.fetch).toHaveBeenCalledTimes(2)` in the test
"background requests get a delay when breaker is open" has failed with a
DIFFERENT actual call count each time (15, 16, 17).
A stable bug produces a stable wrong number — a drifting number means
state is leaking between test cases, not that the logic is simply wrong.

STEPS:
1. Read the actual source module wigleClient.ts. Identify every piece of
   module-level mutable state: circuit breaker counters, request dedup map,
   rate-limit window, retry queue, anything declared outside a function at
   module scope.

2. Read the test file's beforeEach/afterEach (or lack thereof). Confirm
   whether that state actually gets reset between tests.

3. Check timer usage: is jest.useFakeTimers() used consistently across this
   file? If some tests use real timers and the module's retry/backoff logic
   uses real setTimeout, that alone can cause both symptoms (timeouts waiting
   on real delays, and stacked retries bleeding into the next test).

4. Run the suite with --runInBand (single worker, deterministic order) and
   log the call count from the failing assertion on each run. If it stabilizes
   under --runInBand but varies otherwise, that confirms cross-test/cross-file
   pollution rather than logic error.

5. Fix by adding an explicit reset (exported reset function from the module,
   called in beforeEach) for whatever state #1 identified. If the module
   doesn't expose a way to reset itself, that's the actual bug — add one rather
   than working around it with jest.resetModules() everywhere.

6. Do NOT increase the 10000ms timeout as the fix. If timeouts persist after
   state is properly isolated, that's a second, real finding — report it,
   don't paper over it.

7. Confirm fix: run full suite 3 times in a row, confirm the same pass/fail
   result and the same call counts each time. Flaky-turned-deterministic is the
   actual bar, not "happened to pass once."

Report back: what state was leaking, why it wasn't reset, and the exact fix —
before committing.
```

## Historical Context

- This suite has been quietly unreliable across ~dozen sessions in this saga
- Always dismissed as "pre-existing, not our problem" (correct scope discipline)
- But it's been sitting there the whole time, and now that observation timestamp work is done, worth actually fixing
- The drifting call counts (15/16/17) finally provide concrete evidence of state leakage rather than just "timeouts happen sometimes"

## References

- Test file: `tests/unit/services/wigleClient.test.ts`
- Source module: `server/src/services/wigleClient.ts` (find actual path)
- Session: claude-5bf6564f (2026-07-08)
- PR that revealed the drifting pattern: #373 test runs

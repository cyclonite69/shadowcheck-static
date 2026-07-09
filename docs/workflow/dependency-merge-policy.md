# Dependency Merge Policy

## Purpose

**Preserve provenance.** When a dependency update causes a regression, you must be able to answer:

- Which exact Dependabot PR introduced this version?
- Which commit should be reverted if this version causes a production issue?
- Was this version ever validated independently?

Manual conflict resolution (editing `package.json` directly, cherry-picking versions from bundle branches, or regenerating `package-lock.json` without tracing the source) breaks this traceability and makes debugging significantly harder.

**Why stale bundle branches are dangerous:**

Dependabot creates `development-dependencies-*` and `multi-*` bundle branches as snapshots at creation time. If you merge one of these bundles after merging individual PRs, you may:

- Downgrade a dependency that was already merged individually.
- Silently reintroduce an older version, undoing your prior validation.
- Create conflicts that tempt you into manual resolution, breaking provenance further.

Once you've started merging individual Dependabot branches, the bundle branches become stale and should be skipped entirely.

## Decision Tree

```
Multiple branches for same package?
    ├─ Yes
    │   ├─ Newest supersedes older?
    │   │   └─ Yes → Merge newest only, skip others
    │   └─ Not sure?
    │       └─ Stop and verify before proceeding
    └─ No
        └─ Merge normally
```

## Branch Selection Rules

1. **Never merge a `development-dependencies-*` branch** after you've started merging individual package branches. These bundles are stale snapshots.

2. **Never merge a `multi-*` branch unless no individual branches exist** for the packages it contains. If individual PRs are available, use those instead.

3. **Merge only the latest individual Dependabot branch per package.** Example:

   - `dependabot/npm_and_yarn/axios-1.16.0` — skip
   - `dependabot/npm_and_yarn/axios-1.17.0` — skip
   - `dependabot/npm_and_yarn/axios-1.18.0` — **merge this one only**

4. **Treat major-version updates separately.** If both `react-19.0.0` and `react-19.2.7` exist, merge the latest patch within the major version currently in use. If upgrading majors, do that as a separate, deliberate batch.

5. **Confirm newer branches actually supersede older ones.** Read the PR descriptions or check the Dependabot branch creation dates. If you're unsure, don't guess — investigate before merging.

## Validation Matrix

After merging each dependency (or batch of dependencies from the same logical group):

| Step                          | Command / Check                                | Why                                               |
| ----------------------------- | ---------------------------------------------- | ------------------------------------------------- |
| Install dependencies          | `npm install` (if `package-lock.json` changed) | Ensure lockfile is consistent with `package.json` |
| Lint check                    | `npm run lint`                                 | Catch style/import errors early                   |
| Type check                    | `npm run type-check` or `npx tsc --noEmit`     | Catch TypeScript regressions                      |
| Targeted tests                | `npm test -- <relevant test file>`             | Validate modules touched by the dependency        |
| Full test suite (after batch) | `npm test`                                     | Catch cross-module regressions before pushing     |

**Do NOT continue to the next dependency if validation fails.** Classify the failure (see "Regression Classification" below) and either fix it or revert the merge.

## Regression Classification

When validation fails after a dependency merge:

| Classification   | Definition                                                                                                             | Action                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Pre-existing     | Failure reproduces on `origin/master` (no dependency changes). Confirmed via `git checkout origin/master && npm test`. | Document in ACTIVE.md. Safe to continue if pre-existing was already tolerated. |
| Newly introduced | Failure does NOT occur on `origin/master`. Caused by this dependency merge.                                            | Revert the merge. Investigate root cause. Report findings before retry.        |
| Unknown          | Unclear whether failure is pre-existing. Haven't verified against `origin/master`.                                     | Stop. Do not continue merging. Verify against `origin/master` first.           |

**Always verify pre-existing failures on `origin/master` before continuing.** Do not assume.

## Dependency Merge Ledger

Track each merge in a ledger table to preserve provenance and aid future debugging. Use this template:

```markdown
## Dependency Merge Ledger — [Date/Session]

| Package | From Version | To Version | Source Branch                            | Status  | Validation                 | Notes                                                                       |
| ------- | ------------ | ---------- | ---------------------------------------- | ------- | -------------------------- | --------------------------------------------------------------------------- |
| axios   | 1.16.1       | 1.18.0     | dependabot/npm_and_yarn/axios-1.18.0     | Merged  | lint ✓ typecheck ✓ tests ✓ | Clean merge, no conflicts                                                   |
| react   | 19.2.6       | 19.2.7     | dependabot/npm_and_yarn/react-dom-19.2.7 | Merged  | (see notes)                | Peer dependency conflict resolved: bumped both react and react-dom together |
| vite    | 8.0.7        | 8.0.8      | dependabot/npm_and_yarn/vite-8.0.8       | Pending | —                          | Waiting for other merges before validation                                  |
```

Columns:

- **Package**: Dependency name
- **From Version / To Version**: Version being replaced and replacement version
- **Source Branch**: Exact Dependabot branch name (e.g., `dependabot/npm_and_yarn/axios-1.18.0`)
- **Status**: Merged, Pending, Reverted, or Skipped
- **Validation**: Brief summary of what passed/failed (or "—" if not yet run)
- **Notes**: Anything noteworthy (conflicts resolved, special handling, cross-dependencies, etc.)

Include this ledger in the session checkpoint or ACTIVE.md update so future sessions can reconstruct exactly what was merged and why.

## Common Scenarios

### Scenario: React and react-dom version mismatch

**Problem:** `react@19.2.6` requires `react-dom@^19.2.6`, but you have `react-dom@19.2.7`. Dependabot created separate PRs for each.

**Solution:**

1. Do NOT manually edit `package.json` to force versions.
2. Merge both PRs, allowing the conflict on `package.json`.
3. During conflict resolution, align both to the newer version (`react@19.2.7` and `react-dom@19.2.7`).
4. Run `npm install` to regenerate `package-lock.json`.
5. Validate: `npm run lint && npm run type-check && npm test`.
6. Record both packages in the merge ledger with the same timestamp and a note explaining the peer-dependency tie-in.

### Scenario: Multiple branches for the same package

**Problem:** You see:

- `dependabot/npm_and_yarn/axios-1.17.0` (created 2 weeks ago)
- `dependabot/npm_and_yarn/axios-1.18.0` (created 1 week ago)

**Solution:**

1. Merge only `axios-1.18.0`.
2. Skip `axios-1.17.0` (GitHub will auto-close it once `1.18.0` is merged).
3. Record `axios` as "Merged from `1.18.0` branch; skipped `1.17.0` (superseded)" in the ledger.

### Scenario: Bundle branch appears after you've started individual merges

**Problem:** You've merged 5 individual PRs. Dependabot then creates `development-dependencies-2026-07-09` which includes those 5 packages plus others.

**Solution:**

1. **Close the bundle branch without merging.** Do not merge it.
2. Continue merging individual PRs for packages not yet handled.
3. If the bundle contains packages you haven't merged yet, extract only those and look for individual PRs instead.
4. Record in the ledger: "Skipped development-dependencies-2026-07-09 bundle (stale; individual PRs already merged)."

## Standing Commands Reference

```bash
# After merging, run this sequence:
npm install
npm run lint
npm run type-check
npm test

# To verify a failure is pre-existing:
git stash                          # Preserve any uncommitted work
git checkout origin/master
npm install
npm test
# If failures match, they're pre-existing.
# Then return to your branch:
git checkout -
git stash pop
```

## Process Checklist for Merging a Batch

- [ ] Identify all open Dependabot branches
- [ ] Skip `development-dependencies-*` and `multi-*` bundles
- [ ] For each unique package, select only the newest branch
- [ ] For each branch:
  - [ ] Merge
  - [ ] Run `npm install` if lockfile changed
  - [ ] Run `npm run lint`
  - [ ] Run `npm run type-check`
  - [ ] Run targeted tests for affected modules
  - [ ] Add entry to merge ledger
  - [ ] Verify `git show HEAD -- package.json` matches the commit message
- [ ] After batch completes:
  - [ ] Run full test suite
  - [ ] Classify any failures (pre-existing / newly introduced / unknown)
  - [ ] Update ACTIVE.md with investigation status for any unknowns
  - [ ] Push only if green or pre-existing failures are already tolerated
- [ ] Preserve the merge ledger for the next session

---

**Last updated:** 2026-07-09  
**Derived from:** Session analysis of dependency merge workflow; synthesized with input from Response 1 analysis.

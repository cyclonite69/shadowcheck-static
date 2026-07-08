# ADR: Dependabot Merge Conflict Patterns & Fork-Point Risk

**Date**: 2026-07-08  
**Session**: claude-5bf6564f (dependency merge corrections)  
**Status**: Accepted  
**Scope**: Dependency merge workflow, conflict resolution, Dependabot branch handling

---

## Problem Statement

Over multiple sessions, dependency merging introduced 18 no-op commits (commits with messages claiming version upgrades but zero actual `package.json` changes), accidentally deleted the `@playwright/test` dependency, and created React peer-dependency mismatches that blocked `npm install`. Root causes traced to four distinct antipatterns in how Dependabot branches are merged.

This ADR documents the antipatterns, their mechanisms, and the correct resolution approach to prevent recurrence.

---

## Antipattern 1: `git checkout --ours/--theirs package.json`

### The Problem

When a Dependabot merge conflicts on `package.json`, using `git checkout --ours package.json` (or `--theirs`) doesn't intelligently merge two versions—it discards one entirely and takes the other wholesale. The commit message claims the version upgrade happened, but running `npm install` afterward regenerates `package-lock.json` against the _old_ version, cementing no upgrade occurred.

### Evidence

18 of 25 commits in the dependency batch:

- Commit message: `"chore(deps): bump pg to 8.21.0"`
- Actual `git show <sha> -- package.json`: zero version change (pg remained at prior version)
- Root cause: `--ours` took local master's old version, then `npm install` regenerated lockfile to match
- Consequence: Dependabot never closes the PR because the target version was never actually installed

### Example

```bash
# Conflicted merge on pg-8.21.0 branch
git merge origin/dependabot/npm_and_yarn/pg-8.21.0
# CONFLICT (content): Merge conflict in package.json

# Wrong approach — discards the branch's actual changes:
git checkout --ours package.json
npm install                              # Regenerates lockfile against old version
git add package.json package-lock.json
git commit -m "chore(deps): bump pg to 8.21.0"  # Commit message lies

# Verification shows the truth:
git show HEAD -- package.json | grep '"pg"'    # Shows OLD version, not 8.21.0
```

### Correct Approach

```bash
# Resolve by explicitly installing the target version:
npm install pg@8.21.0 --save
git add package.json package-lock.json
git commit -m "chore(deps): bump pg to 8.21.0"

# Verify:
git show HEAD -- package.json | grep '"pg"'    # Shows "pg": "8.21.0"
```

### Rule

**Never use `git checkout --ours/--theirs package.json` for Dependabot merges.** Always use `npm install <pkg>@<version> --save` (or `--save-dev`) with an explicit target version. Verify immediately after:

```bash
git show HEAD -- package.json | grep '<pkg>'
```

---

## Antipattern 2: Dependabot Branch Fork-Points & Subsequent Dependencies

### The Problem

Dependabot branches are snapshots from their creation date. If a new dependency is added to `package.json` _after_ a Dependabot branch is created, that branch will never have it. Using `git checkout --theirs package.json` silently removes it without warning.

### Evidence

- `react-dom-19.2.7` Dependabot branch created: June 22, 2026
- `@playwright/test` added to `package.json`: later session (commit `aaa72f67`)
- Merge resolution using `--theirs`: dropped `@playwright/test` from `package.json`
- No warning or error — the dependency simply vanished
- Consequence: Type-check failures in e2e tests; `@playwright/test` module missing

### Example

```bash
# react-dom branch created June 22, before @playwright/test was added
git log --oneline origin/dependabot/npm_and_yarn/react-dom-19.2.7 -1
# Output: 0abcdef (created June 22)

# @playwright/test was added later (commit aaa72f67)
git log --oneline aaa72f67 -1
# Output: aaa72f67 (created July 5)

# Taking --theirs from react-dom branch loses @playwright/test:
git checkout --theirs package.json    # Rolls back package.json to June 22 state
# @playwright/test is gone — it didn't exist in the branch at all
```

### Correct Approach

Before any branch merge, audit what dependencies were added to `package.json` since that branch's fork point:

```bash
BRANCH_DATE=$(git log -1 --format=%ci origin/dependabot/npm_and_yarn/react-dom-19.2.7 | cut -d' ' -f1)
git log --oneline --since="$BRANCH_DATE" -- package.json | head -20
```

If you're going to take `--theirs` (or if the merge conflicts), manually restore any dependencies added after the branch was created:

```bash
npm install @playwright/test@^1.61.1 --save-dev
```

### Rule

**Before merging a Dependabot branch, verify nothing critical was added to `package.json` after the branch's fork point.** If dependencies are missing after merge, restore them with `npm install <pkg>@<version> --save-dev` and re-commit.

---

## Antipattern 3: React/react-dom Peer-Dependency Mismatches

### The Problem

`react-dom` has a peer dependency on `react` with a strict version requirement (e.g., `react-dom@19.2.7` requires `react@^19.2.7`). Having a mismatched pair (e.g., `react@19.2.6` + `react-dom@19.2.7`) triggers an ERESOLVE error and blocks all `npm` operations.

### Evidence

- `npm install` hung with: `ERESOLVE unable to resolve dependency tree`
- `react@19.2.6` in `package.json` but `react-dom@19.2.7` was merged
- No Dependabot branch existed for bare `react` (only `react-dom`, `react-is`, `react-router-dom`)
- Consequence: All subsequent `npm` commands fail until versions are aligned

### Example

```bash
# After merging react-dom-19.2.7, trying to install anything fails:
npm install
# npm ERR! ERESOLVE unable to resolve dependency tree
# npm ERR! While resolving: shadowcheck-web@1.0.0
# npm ERR! Found: react@19.2.6
# npm ERR! node_modules/react
# npm ERR!   react@19.2.6
# npm ERR! ... peer react@"^19.2.7" from react-dom@19.2.7

# Resolution: must update both at the same time
npm install react@19.2.7 react-dom@19.2.7
```

### Correct Approach

1. Check peer dependencies before merging:

   ```bash
   npm view react-dom@19.2.7 peerDependencies
   # Returns: { react: '^19.2.7' }
   ```

2. Verify both versions exist:

   ```bash
   npm view react versions --json | tail -20  # Check latest
   ```

3. Merge/install both together:
   ```bash
   npm install react@19.2.7 react-dom@19.2.7 --save
   git add package.json package-lock.json
   git commit -m "chore(deps): align react and react-dom to 19.2.7"
   ```

### Rule

**Never merge `react-dom` without immediately aligning `react` to the same major/minor version.** Check `npm view <pkg> peerDependencies` first, then install both. If Dependabot didn't create a matching `react` branch, check `multi-*` or `security-updates-*` bundle branches for the matching version.

---

## Antipattern 4: Suppressing `npm install` Output Hides Peer-Dep Warnings

### The Problem

Running `npm install` with output suppressed (`>/dev/null 2>&1`) in a merge loop swallows peer-dependency warnings until the complete batch finishes. Critical mismatches (like React/react-dom) don't surface until the final commit, making it hard to identify which merge introduced the problem.

### Evidence

- Loop merging `deck.gl/layers`, `preact`, `react-dom` with suppressed output
- `react@19.2.6` vs `react-dom@19.2.7` mismatch not detected until full suite run
- By then, multiple commits had already landed
- Consequence: Harder to identify and fix the specific problematic merge

### Rule

**Never suppress `npm install` output during dependency merge batches.** Run with visible output so peer-dependency warnings surface immediately:

```bash
# Good: visible output
npm install

# Bad: suppressed output during merges
npm install >/dev/null 2>&1
```

Only suppress output after the entire batch is complete and all dependencies have been validated.

---

## Antipattern 5: Feature Branch Fork-Points Can Reintroduce Commits

### The Problem

If a feature branch was created before a commit that later lands via merge (e.g., on master), and then master is reset, the feature branch can accidentally reintroduce that commit if it was rebased or re-merged. A hard reset to `origin/master` doesn't prevent this if the feature branch's ancestry includes the commit via a transitive merge.

### Evidence

- Commit `b1c1216a` (Vite NODE_ENV fix) should have been on `fix/observation-timestamp-normalization` only
- It landed on master via earlier merge commit
- Even after `git reset --hard origin/master` to discard all subsequent work, it showed up again in `origin/master..HEAD` audit
- Root cause: Feature branch was created _before_ the Vite fix, so it's part of the branch's ancestry; re-merging the branch reintroduced it

### Correct Approach

Before destructive operations (like reset or rebase):

```bash
# Verify the branch doesn't contain unintended commits:
git log --oneline origin/master..origin/<feature-branch>

# Check where a specific commit actually originated:
git branch --contains b1c1216a

# Check the full graph to understand merge topology:
git log --all --oneline --graph | grep -B5 -A5 b1c1216a
```

If a feature branch contains a commit you want to drop, rebase it out:

```bash
# Interactive rebase to drop the commit from the feature branch
git checkout origin/<feature-branch>
git rebase -i <commit>~1  # Drop the commit interactively
git push --force-with-lease origin <feature-branch>
```

### Rule

**Before resetting master or before merging a feature branch, verify the branch's full lineage with `git log --oneline` and `git branch --contains`.** Don't assume a reset discard something that's part of a feature branch's ancestry.

---

## Complete Merge Workflow for Next Batch

Follow this sequence to avoid all five antipatterns:

1. **Enumerate and audit branches**

   ```bash
   git branch -r | grep dependabot
   for branch in $(git branch -r | grep dependabot); do
     echo "=== $branch ==="
     git log -1 --format="%ci %h %s" "$branch"
   done
   ```

2. **For each branch, check fork date vs. recent `package.json` additions**

   ```bash
   BRANCH_DATE=$(git log -1 --format=%ci origin/<branch> | cut -d' ' -f1)
   git log --oneline --since="$BRANCH_DATE" -- package.json
   ```

3. **Merge one branch at a time with visible output**

   ```bash
   git checkout master
   git merge --no-ff origin/dependabot/...
   # If conflict: resolve manually or use npm install <pkg>@<version>
   ```

4. **Immediately verify the actual version change**

   ```bash
   git show HEAD -- package.json | grep '<pkg-name>'
   ```

5. **Run `npm install` (not in a loop, with visible output)**

   ```bash
   npm install    # No output suppression
   ```

6. **After merge, check peer dependencies**

   ```bash
   npm ls  # Any unmet peer deps will show here
   ```

7. **Commit (if merge was clean)**

   ```bash
   git commit -m "chore(deps): <description>"  # Or --continue if auto-merged
   ```

8. **After full batch**

   ```bash
   npm ci         # Clean install from lockfile
   npm test       # Full test suite
   npm run lint && npm run typecheck
   ```

9. **Before push**
   ```bash
   gh auth status  # Confirm identity
   git push origin master
   ```

---

## Key Insight: Commit Messages Can Lie

A commit message that says `"bump pg to 8.21.0"` does not guarantee pg was actually bumped. The only reliable verification is:

```bash
git show <sha> -- package.json | grep '"pg"'
```

This is why this workflow requires immediate verification after each merge — to catch the lie before it spreads.

---

## Verification Checklist (Copy for Next Batch)

- [ ] Check fork dates for all Dependabot branches
- [ ] Audit what was added to `package.json` since each branch's fork point
- [ ] Merge one branch at a time (no batch merges with loops)
- [ ] After each merge: `git show HEAD -- package.json | grep <pkg>`
- [ ] Never use `git checkout --ours/--theirs package.json`
- [ ] Always use `npm install <pkg>@<version> --save-dev` with explicit target
- [ ] Run `npm install` with **visible output** during merge batches
- [ ] After batch: `npm ci` (clean install), `npm ls` (peer deps), `npm test`, lint, typecheck
- [ ] Before push: `gh auth status` to confirm identity
- [ ] After push: watch for Dependabot re-scan to close the merged PRs

---

## References

- Session: claude-5bf6564f (dependency merge corrections)
- Checkpoint: `checkpoints/003-dependency-merge-patterns.md` (Codex local)
- Feature branch with buried fix: `fix/observation-timestamp-normalization`
- Commits this session: `40b60fd4..aa983f68` (7 commits to master)
- Pushed: `origin/master` range `a9313cae..aa983f68`

---

## Follow-Up

1. Update `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` with one-line reference to this ADR
2. Rebase `fix/observation-timestamp-normalization` to drop duplicate Vite fix (now in master `7917b375`)
3. Watch Dependabot re-scan (24h) for PR closures as independent verification

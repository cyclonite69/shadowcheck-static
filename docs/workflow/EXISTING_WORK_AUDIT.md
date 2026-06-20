# Existing Work Audit First

## Hard Rule

Before any agent implements, rewrites, deletes, refactors, documents, tests, or continues a substantive task, it must first determine what already exists.

Implementation must not begin until the agent has completed a repository-content-read-only Existing Work Audit, reported the findings, and received explicit approval for the resulting scope.

The default prompt is:

> Audit this task. Report what exists, what is missing, and the safest next move. Do not edit yet.

This prevents duplicate systems, conflicting files, stale documentation, unnecessary rewrites, broad staging, coverage churn, and collisions between active lanes.

## Phase 0: Existing Work Audit

The audit phase may inspect repository and runtime state but must not modify project files, stage changes, commit, push, apply migrations, mutate databases, trigger jobs, consume external API quota, or alter stashes.

Start by establishing repository and ownership state:

```bash
git fetch origin
git status -sb
git status --short --untracked-files=all
git log --oneline --decorate -10
git stash list --format='%gd %H %gs'
```

Then inspect the existing implementation before proposing files:

- relevant source, routes, services, repositories, components, and utilities;
- package scripts and existing tooling;
- focused tests for the same module, route, service, and behavior;
- feature flags, settings, persistence keys, and configuration pages;
- schema documentation, migrations, views, and query ownership;
- subsystem docs, ADRs, session notes, prior audits, and roadmaps;
- generated reports and their canonical generation path;
- current dirty files, staged files, stashes, and active lane ownership;
- recent related commits and interrupted or partial work.

Use targeted searches rather than assuming a blank slate:

```bash
git grep -n "<feature>\|<route>\|<service>\|<setting>\|<test>" -- \
  package.json docs server client scripts etl tests sql \
  ':!node_modules' ':!coverage' ':!dist'
```

Do not regenerate an audit, schema, metrics, or coverage report during discovery unless the user explicitly requests regeneration.

## Required Intake Report

Stop after discovery and provide this report before editing:

```text
Existing Work Audit Report

Repo state:
- HEAD:
- origin/master:
- branch synced:
- worktree clean/dirty:
- staged files:
- unstaged files:
- untracked files:
- stashes preserved:

Existing implementation:
- source files found:
- helpers/utilities found:
- routes/endpoints found:
- feature flags/settings found:
- migrations/schema found:
- scripts found:
- tests found:
- docs found:

Prior related work:
- commits:
- audit docs:
- roadmap docs:
- generated reports:

Gaps:
- missing behavior:
- stale behavior:
- duplicated behavior:
- risky areas:

Recommendation:
- reuse existing:
- extend existing:
- replace existing:
- remove confirmed cruft:
- write tests first:
- no change needed:

Proposed edit scope:
- files to edit:
- files explicitly excluded:
- validation plan:
```

If existing work already satisfies the request, recommend no change.

## Approval Gate

Implementation requires one explicit decision after the intake report:

```text
Approved: extend existing implementation only.
Approved: replace existing implementation because the audit found it obsolete.
Approved: remove confirmed cruft only.
Stop: no implementation. Existing work already satisfies the request.
```

Approval applies only to the reported scope. New evidence that materially changes the file list, behavior, data impact, or ownership boundary requires a revised intake report and renewed approval.

## Safe Meaning of `continue`

`Continue` never means start from memory or resume every visible dirty change.

It means:

1. Re-audit the current worktree.
2. Identify the interrupted lane and its owner.
3. Verify that dirty and staged files belong to that lane.
4. Compare HEAD with the expected remote state.
5. Resume only the approved lane.
6. Preserve unrelated files and stashes.

If ownership is unclear, stop and report the ambiguity.

## Generic Prompt Handling

Generic prompts do not override the audit gate. A prompt such as `Write tests for @filename` is not implementation approval by itself.

Before acting, determine:

- whether the filename is real and current;
- whether another agent owns it;
- whether equivalent tests already exist;
- whether the referenced code path is still used;
- whether the requested test would duplicate or weaken existing coverage;
- whether the work belongs to a broader active testing lane.

If the prompt conflicts with a completed or reserved lane, do not act on it. Report the conflict.

## Task-Specific Audit Requirements

### Tests

- Search existing unit, integration, property, and UI tests for the same behavior.
- Trace the real route, container, service, or render path before preserving an old test shape.
- State whether the work extends an existing test file or requires a new one.
- Avoid duplicate assertions, broad snapshot churn, unrelated coverage expansion, and full-coverage refreshes unless approved.
- If a test exposes a production bug, stop and report before broad production edits.

### Documentation

- Search subsystem docs, schema docs, ADRs, session notes, audit reports, README indexes, and wiki mirrors.
- Update or link the canonical document before creating parallel documentation.
- Use git history to establish what changed since the last verified documentation update.
- Do not regenerate unrelated reports as a substitute for correcting current documentation.

### Scripts and Tooling

Before creating a script, inspect `package.json`, `scripts/`, existing audit utilities, and package commands:

```bash
npm run
git grep -n "policy:modularity\|lint:boundaries\|coverage:refresh\|audit\|cruft\|modularity\|roadmap" -- \
  package.json scripts docs tests
```

Prefer extending an existing command or shared utility. Create a separate tool only when the audit shows that responsibilities, cadence, or output contracts are genuinely distinct.

### Cruft and Deletion

No file is deleted merely because a static scan reports it unused. Confirm all of the following before proposing deletion:

- no static imports or re-exports;
- no route, container, plugin, or registry registration;
- no dynamic import, reflection, or string-based reference;
- no package-script, deployment, or operational usage;
- no generated-artifact dependency;
- no documentation-only runbook usage;
- no active lane or stash dependency;
- explicit deletion approval after the evidence report.

### Modularity and Refactoring

- Identify current responsibilities, callers, side effects, and tests.
- Establish role locks and characterization tests before extraction.
- Prefer pure extraction before moving I/O or database boundaries.
- Defer database mutators and stored SQL splitting until integration behavior is protected.
- Do not combine refactoring with unrelated cruft deletion.

## Implementation and Final Report

After approval:

- edit only the approved files;
- preserve unrelated dirty work;
- stage explicit paths or hunks only;
- run focused validation before broad gates;
- stop if a real production bug or scope expansion is discovered;
- do not commit or push without the repository's required approval.

The final report must state:

- what existing work was reused or extended;
- exact files changed;
- validation results and exact failures;
- excluded lanes and untouched dirty files;
- commit and push state;
- remaining worktree changes and their owner;
- deferred work and why it was not included.

## Operating Principle

Audit first. Then decide. Implement from evidence, never from assumption.

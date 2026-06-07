# Decision: VISINT Evidence Integrity and DB Write Protection Incident

**Date:** 2026-06-07

**Context:** Agent-created VISINT evidence rows and database write protection

---

## Incident

During VISINT testing, agents created persistent media rows in the working
database without explicit operator approval.

Gemini created `app.network_media` ids `5`, `6`, and `7` through direct
`correlate-visint` API calls where the `commit` field was omitted. At the time,
the server defaulted omitted `commit` to `true`, so those correlation requests
persisted media rows.

Kiro created `app.network_media` ids `9` and `10` through runtime QA calls that
persisted `saveVisINTAttachment` output.

## Root Cause

The immediate VISINT persistence failure was not just that `commit` was omitted.
The unsafe behavior was that omitted `commit` defaulted to `true` on the server,
turning exploratory correlation requests into database writes.

The operational failure was that agents executed write-capable API/runtime paths
against the working database without explicit approval of the exact write
operation.

## Cleanup Completed

- Agent-created media rows `5`, `6`, `7`, `9`, and `10` were deleted by operator
  instruction.
- Stale `045` and `046` migrations were deleted.
- A prevention patch was pushed so VISINT correlation no longer silently
  persists media rows when `commit` is omitted.
- A database write-protection rule was pushed into the active agent instructions.

## Current Evidence State

`app.network_media` contains only id `8`.

Media id `8` is attached to real BSSID `2C:58:4F:9D:31:68`. It is a valid JPEG
media attachment:

- filename: `20260602_202827.jpg`
- file size: `14506231` bytes
- MIME type: `image/jpeg`

The target BSSID exists in `app.networks`:

- SSID: `HOME-0D36`
- type: `W`
- manufacturer/OUI: `Commscope / 2C584F`
- sentinel: `false`

The `app.network_tags` row for that BSSID is empty:

- tags: `[]`
- threat tag: `null`
- notes: `null`

There is no `app.surveillance_detections` row for that BSSID.

## Explicit Non-Findings

Media id `8` is valid media only. It is not currently classified as ShotSpotter.

Media id `8` does not have `SHOTSPOTTER_SENSOR` tags, `VISINT_CONFIRMED` tags,
or `VISINT_VERIFIED` tags.

Media id `8` is not present in `app.surveillance_detections`.

## Operating Decision

Agents must not perform writes against the working database without explicit
operator approval of the exact operation first.

Write operations include:

- SQL writes such as `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, and migrations.
- Seed data loads.
- API calls to write-capable endpoints.
- Runtime QA calls to service functions that persist rows.
- Any command that mutates live `app.*` tables.

Before any write, the agent must show the exact SQL or command, state the exact
tables and rows expected to change, provide a rollback plan, and wait for
explicit operator confirmation.

## Future Work

The broad `HOME-*` VISINT scorer behavior is a separate scorer-semantics issue,
not part of the evidence cleanup incident. It should be handled in a dedicated
future workstream:

`VISINT scorer semantics audit`

That future workstream should audit SSID-only scorer rules, decide how candidate
evidence differs from classification, and clarify evidence identity, dedup, and
sibling-group behavior.

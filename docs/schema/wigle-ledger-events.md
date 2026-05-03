# WiGLE Ledger Events — Schema Reference

Last verified: 2026-05-02 (http_status column added).

## `app.wigle_ledger_events`

In-memory + DB ledger for all outbound WiGLE API requests. Used to enforce
soft-limit quotas, power the Admin Ledger panel, and provide empirical data
for setting real rate limits.

**PK:** `id bigint` (sequence)

| Column          | Type        | Notes                                                                                                                                                  |
| --------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`            | bigint      | PK                                                                                                                                                     |
| `kind`          | text        | Request kind: `search` \| `detail` \| `stats`                                                                                                          |
| `status`        | text        | Outcome: `success` \| `error` \| `rate_limited` \| `skipped`                                                                                           |
| `duration_ms`   | integer     | Round-trip latency in milliseconds                                                                                                                     |
| `error_message` | text        | Human-readable error reason (e.g. `"HTTP 429: Too Many Requests"`, `"timeout after 15043ms"`, `"circuit breaker open"`)                                |
| `http_status`   | integer     | Actual HTTP status code returned by WiGLE (e.g. 200, 404, 429). NULL for pre-2026-05-02 rows and for errors that threw before a response was received. |
| `requested_at`  | timestamptz | default now()                                                                                                                                          |

## Notes

- `http_status` was added via migration `20260502_ledger_http_status.sql`.
- Rows older than 25 hours are pruned on each server startup (`hydrateLedger()`).
- The in-memory `requestLedger` is hydrated from this table on startup so the
  24h quota window survives container restarts.
- `detail` kind has no soft limit (removed 2026-05-02 — no empirical basis yet).
  `search` soft limit: 50/24h. `stats` soft limit: 10/24h.
- `updateLedgerOutcome()` in `wigleRequestLedger.ts` updates the most recent row
  for a given kind after the response is received — this is how `http_status` and
  `error_message` are populated post-request.

## Useful queries

```sql
-- Real WiGLE response codes for detail requests
SELECT http_status, COUNT(*), MIN(requested_at), MAX(requested_at)
FROM app.wigle_ledger_events
WHERE kind = 'detail'
GROUP BY http_status ORDER BY http_status;

-- Error breakdown
SELECT status, error_message, COUNT(*)
FROM app.wigle_ledger_events
WHERE kind = 'detail' AND status != 'success'
GROUP BY status, error_message ORDER BY COUNT(*) DESC;
```

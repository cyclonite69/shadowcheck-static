# WiGLE Ledger Events — Schema Reference

Last verified: 2026-06-17.

## `app.wigle_ledger_events`

In-memory + DB ledger for all outbound WiGLE API requests. Used to enforce
soft-limit quotas, power the Admin Ledger panel, and provide empirical data
for setting real rate limits.

**PK:** `id bigint` (sequence)

| Column             | Type        | Notes                                                                                                                                                  |
| ------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`               | bigint      | PK                                                                                                                                                     |
| `kind`             | text        | Request kind: `search` \| `detail` \| `stats`                                                                                                          |
| `status`           | text        | Outcome: `success` \| `error` \| `rate_limited` \| `skipped`                                                                                           |
| `phase`            | text        | Tracking: `pending` \| `complete`                                                                                                                      |
| `query_source`     | text        | Trigger: `manual` \| `scheduled` \| `import` \| `enrichment` \| `live-route` \| `settings-test` \| `kml_sync`                                          |
| `query_url`        | text        | The full URL requested from WiGLE (forensic audit trail)                                                                                               |
| `query_params`     | jsonb       | The parameters sent with the request                                                                                                                   |
| `duration_ms`      | integer     | Round-trip latency in milliseconds                                                                                                                     |
| `result_count`     | integer     | Number of results returned (search kind only)                                                                                                          |
| `retry_after_hint` | integer     | Seconds from WiGLE `Retry-After` header on 429 responses                                                                                               |
| `error_message`    | text        | Human-readable error reason                                                                                                                            |
| `http_status`      | integer     | Actual HTTP status code returned by WiGLE (e.g. 200, 404, 429). NULL for pre-2026-05-02 rows and for errors that threw before a response was received. |
| `requested_at`     | timestamptz | default now()                                                                                                                                          |
| `meta`             | jsonb       | Additional JSON metadata                                                                                                                               |

## Operational Semantics

### Phase Tracking

- **`pending`**: Ledger row created before the outbound WiGLE fetch completes.
- **`complete`**: Outcome recorded after response, error, or rate-limit.

### Query Source

Used to track the origin of WiGLE requests for quota attribution and behavior analysis:

- `manual`: Direct user action in the explorer or dashboard.
- `scheduled`: Automated background tasks like KML sync.
- `import`: Explicit bulk import runs.
- `enrichment`: Automated network enrichment/detail fetching.

### `ledgerId` and Atomic Updates

- `recordRequest()` returns the concrete ledger row `id`.
- `updateLedgerOutcome()` uses this `id` for atomic updates, eliminating race conditions on concurrent requests.
- The previous "latest-row" heuristic remains only as a fallback for cases where the ID was not successfully captured.

### Retry-After Parsing

- `retry_after_hint` captures the integer seconds from the WiGLE `Retry-After` header on 429 responses.
- This is used by the self-tuning rate limiter (`wigleLimits.ts`) to adjust wait times dynamically.

## Notes

- Rows older than 25 hours are pruned on each server startup (`hydrateLedger()`).
- The in-memory `requestLedger` is hydrated from this table on startup so the 24h quota window survives container restarts.
- Self-tuning logic uses `app.v_wigle_rate_limit_events` to calculate safe limits based on empirical wall-hit data.

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

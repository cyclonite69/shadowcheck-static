# Decision: V3 Enrichment Table — Inline Tooltip Skipped

**Date:** 2026-04-13  
**Context:** Tooltip alignment project — wiring `renderNetworkTooltip` into non-geospatial admin tables

---

## Decision

The V3 enrichment table (`V3EnrichmentManagerTable.tsx`) intentionally has **no inline tooltip**.

## Reason

When a row is clicked, `onSelect(bssid)` fires, which causes `WigleDetailTab` to render a full
"Network Forensics" panel that already includes:

- `renderNetworkTooltip(normalizeTooltipData(...))` — the exact same forensic card, scaled at 85%, in a dedicated "Forensic Tooltip Preview" section
- WiGLE observation count, local matches, new records, quality score
- Address intelligence (street, city, region, postalcode)
- Trilateration lat/lon with cluster accuracy
- First seen / last seen / channel timestamps
- Full individual observations table (deep forensic data)

Adding a second inline tooltip below the table row would duplicate the forensic card that is
already loading at the top of the page. The detail panel is strictly richer than what the
tooltip alone can show.

## Verdict

`onSelect` is the correct UX for v3. The inline tooltip pattern (used in WigleSearchTab and
OrphanNetworksPanel) is additive where no other detail view exists. It is redundant here.

---

## Future Work: Dropped WiGLE Fields

The following WiGLE API fields are currently dropped by `normalizeTooltipData` because
`renderNetworkTooltip` has no rendering code for them:

| Field         | WiGLE meaning                     | SIGINT relevance                                   |
| ------------- | --------------------------------- | -------------------------------------------------- |
| `freenet`     | Open / free network flag          | Open networks are higher-risk surveillance vectors |
| `paynet`      | Commercial / pay network flag     | Distinguishes commercial hotspots from residential |
| `dhcp`        | DHCP enabled flag                 | Useful for client tracking analysis                |
| `bcninterval` | Beacon interval (TUs)             | Non-standard intervals can indicate rogue APs      |
| `userfound`   | User who first submitted to WiGLE | Attribution / provenance                           |
| `transid`     | WiGLE transaction ID              | Correlates submissions across sessions             |
| `countrycode` | ISO country code                  | Jurisdiction context for cross-border surveillance |

These fields arrive from WiGLE v2 search results but are silently dropped at the normalizer
boundary. They are not a data-loss bug — the tooltip was never built to display them.

**Future enhancement:** Add a "WiGLE Metadata" section to `renderNetworkTooltip` (or a
companion component) that surfaces these fields when present. Prioritize `freenet`, `paynet`,
and `bcninterval` as highest forensic value for SIGINT use cases.

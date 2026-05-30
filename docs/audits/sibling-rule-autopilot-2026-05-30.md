# ShadowCheck Sibling-Rule Safety Audit & Autopilot Split Report (2026-05-30)

This report presents a thorough safety audit and refactored implementation strategy for the newly mined wireless sibling rules. It splits the candidates into strict safety tiers and restricts the immediate draft deliverables strictly to **Tier A (Ubiquiti UniFi VAP)**, completely avoiding broad or risky global aggregations.

---

## 1. Safety Tiers Classification

To protect database integrity and prevent false-positive same-chassis pairing, all mined rules are partitioned into three strict safety tiers:

### Tier A — Safe / Deterministic / Ready for Implementation

- **Ubiquiti UniFi (`xx:E2:C6`) VAP Rule**:
  - _Mechanism_: Identical suffix bytes 5–6 + identical lower nibble of byte 4.
  - _Collision Risk_: Negligible. Locks 24 bits of suffix/OUI + 4 bits of lower-nibble mapping = 28 bits of hard physical chassis identity.
  - _Status_: **Approved**. Isolated in the draft migration and verified with 100% test passes.

### Tier B — Promising but Needs Deeper Independent Audits

- **Mist Systems VAP**: Safe first 5 octets, but high delta range (delta <= 18) requires separate site-correlation analysis.
- **Comcast Vantiva**: Target `C6:4F:D5`, but requires further verification of virtual interface rotation templates.
- **GM Vehicle Hotspots (Complementary OUIs)**: Pairs vehicle radios across Complement-OUIs. Safe under strict SSID-equality constraint, but should live in a separate isolated migration.
- **Netgear (`6C:CD:D6`)**: Targeted delta <= 3 on fourth octet with identical last octet. Needs separate validation.
- **Arcadyan HOME-EE7D**: Specific rotating first-octet HOME-EE7D gateways.

### Tier C — Too Broad / Forbidden from Shipping

- **General Rotating First-Octet**:
  - _Mechanism_: Grouping any BSSIDs sharing bytes 2–6 with rotating first octets globally.
  - _Risk_: **High**. Standard sequential chipsets (e.g. Cisco, HPE, medical networks) could easily collide or bridge. Must not be implemented as a generic rule; convert only to narrow, vendor-scoped rules.
- **Home Gateway Class C Relaxation**:
  - _Mechanism_: Extending the universal Class C delta from 3 to 6.
  - _Risk_: **High**. Breaks the strict delta-3 limit for global standard OUIs, creating false-positive bridges across nearby sequentially-numbered enterprise installations.
- **GL.iNet / Askey / Sagemcom Combined Block**:
  - _Mechanism_: High-delta matching combined across multiple unrelated vendors.
  - _Risk_: High false-positive rate.

---

## 2. Validation and Test Results (Tier A Only)

The isolated Ubiquiti UniFi VAP sibling rule was applied to `shadowcheck_test` and validated against our targeted integration test cases:

```bash
PASS tests/integration/findSiblingRadios.test.ts (11.596 s)
  Unified Sibling Sieve (find_sibling_radios)
    ...
    ✓ Ubiquiti VAPs: preserves same-chassis cross-band pairing with different fourth octets (F6:E2:C6:16:6E:F5 ↔ F6:E2:C6:86:6E:F5) (78 ms)
    ✓ Ubiquiti VAPs: preserves same-chassis global-to-LAA cross-band pairing (F4:E2:C6:46:6E:F5 ↔ F6:E2:C6:E6:6E:F5) (62 ms)
    ✓ Ubiquiti VAPs Negative: mismatching suffix must not pair (F6:E2:C6:16:6E:F5 ↔ F6:E2:C6:16:8A:F2) (59 ms)
    ✓ Ubiquiti VAPs Negative: mismatching fourth-octet lower nibble must not pair (F6:E2:C6:16:6E:F5 ↔ F6:E2:C6:15:6E:F5) (66 ms)
Test Suites: 1 passed, 1 total
Tests:       50 passed, 50 total
```

---

## 3. Split Migration Roadmap

All draft rule families have been decoupled. Instead of a bundled migration, we propose:

1.  `20260530_023_ubiquiti_unifi_vap_sibling_rule.sql` — **Tier A (Ubiquiti UniFi only)**
2.  `20260530_024_gm_vehicle_hotspot_complement_rule.sql` — **Tier B (GM vehicle complement only)**
3.  `20260530_025_mist_vap_sibling_rule.sql` — **Tier B (Mist sequential APs only)**
4.  `20260530_026_comcast_vantiva_sibling_rule.sql` — **Tier B (Comcast gateways only)**
5.  `20260530_027_netgear_sibling_rule.sql` — **Tier B (Netgear dual-band only)**
6.  `20260530_028_arcadyan_sibling_rule.sql` — **Tier B (Arcadyan rotating only)**

---

## 4. Human Approval Gates

- **Pristine DB verified**: Database functions successfully restored to master baseline.
- **Git Staged**: None. All files left unstaged and uncommitted.
- **Next Proposed Commit**: Isolated Ubiquiti UniFi VAP migration + tests + docs.

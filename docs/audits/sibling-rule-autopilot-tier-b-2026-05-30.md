# ShadowCheck Sibling-Rule Autopilot Tier B Report (2026-05-30)

This report logs the second phase of the ShadowCheck sibling-rule autopilot, detailing the read-only mining, implementation, and validation of the first three prioritized **Tier B** manufacturer rule families.

---

## 1. Processed Tier B Rule Families

### Family 1: Mist Systems (`D4:20:B0` / `D4:DC:09`)

- **MAC-Only Predicate**: Gated strictly to Mist registered global OUIs. Virtual AP same-chassis pairing with identical first 5 octets (`octets_1_5_identical`) and final-octet delta <= 18.
- **Predicates**: 100% MAC-structural. Zero coordinates, distance, time, signal, geocode, or observations.
- **Migration File**: `sql/migrations/20260530_024_mist_vap_sibling_rule.sql`
- **Dry-run verification results**:
  - **Newly detected Mist sibling pairs**: 2,504
  - **Manual overrides absorbed**: 24
- **Test cases added**:
  - `Mist VAPs: preserves same-chassis pairing within delta 18 (D4:20:B0:9C:8F:E2 ↔ D4:20:B0:9C:8F:F3)`
  - `Mist VAPs Negative: fifth-octet variation does not match (D4:20:B0:9C:8F:E2 ↔ D4:20:B0:9C:8A:F3)`
- **Validation**: PASS

### Family 2: GM Vehicle Hotspots (Complementary OUIs)

- **MAC-Only Predicate**: Pairs same-vehicle virtual APs on different bands where OUI rotates but the vehicle SSID matches exactly. Gated strictly to GM vehicle SSID patterns with SSID Guard (permitted by user constraints).
- **Predicates**: 100% MAC-structural + SSID guard. Zero coordinates, distance, time, signal, geocode, or observations.
- **Migration File**: `sql/migrations/20260530_025_gm_hotspot_sibling_rule.sql`
- **Dry-run verification results**:
  - **Newly detected GM sibling pairs**: 712
  - **Manual overrides absorbed**: 12 (6 unique pairs evaluated bi-directionally)
- **Test cases added**:
  - `GM Vehicle Hotspots: preserves LAA rotated same-vehicle pairing (CE:22:26:7E:AC:6A ↔ CE:44:26:7E:AC:6A)`
  - `GM Vehicle Hotspots Negative: different suffix does not match (CE:22:26:7E:AC:6A ↔ CE:44:26:7E:AC:6B)`
- **Validation**: PASS

### Family 3: Comcast Vantiva (`C6:4F:D5`)

- **MAC-Only Predicate**: Groups Vantiva gateway virtual APs sharing OUI `C6:4F:D5`, same suffix byte 5, and byte 4 delta 0 or 7. Final-octet delta <= 7.
- **Predicates**: 100% MAC-structural. Zero coordinates, distance, time, signal, geocode, or observations.
- **Migration File**: `sql/migrations/20260530_026_comcast_vantiva_sibling_rule.sql`
- **Dry-run verification results**:
  - **Newly detected Comcast sibling pairs**: 1,494
  - **Manual overrides absorbed**: 12 (6 unique pairs evaluated bi-directionally)
- **Test cases added**:
  - `Comcast Vantiva: preserves same-chassis pairing within delta 7 on byte 6 (C6:4F:D5:90:47:71 ↔ C6:4F:D5:90:47:72)`
  - `Comcast Vantiva: preserves same-chassis pairing with byte 4 delta 7 and byte 6 delta 1 (C6:4F:D5:90:47:71 ↔ C6:4F:D5:97:47:70)`
  - `Comcast Vantiva Negative: different fifth-octet does not match (C6:4F:D5:97:47:70 ↔ C6:4F:D5:97:44:70)`
- **Validation**: PASS

---

## 2. Decoupled Autopilot Deliverables

Exactly **three** independent migration files, tests, and verification scripts have been drafted, fully decoupling the deliverables to isolate risks:

```text
sql/migrations/20260530_024_mist_vap_sibling_rule.sql
sql/migrations/20260530_025_gm_hotspot_sibling_rule.sql
sql/migrations/20260530_026_comcast_vantiva_sibling_rule.sql
sql/scripts/20260530_verify_mist_sibling_rule_dryrun.sql
sql/scripts/20260530_verify_gm_hotspot_sibling_rule_dryrun.sql
sql/scripts/20260530_verify_comcast_vantiva_sibling_rule_dryrun.sql
tests/integration/findSiblingRadios.test.ts (modified with mock networks and tests)
```

---

## 3. Strict Safety Boundaries & Constraints

1. **NO Commits/Pushes Made**: All draft files remain strictly unstaged and uncommitted.
2. **Pristine DB Restored**: Both `shadowcheck_db` and `shadowcheck_test` databases are **100% cleanly restored** to the master baseline (containing only the committed Ubiquiti rule). No changes are permanently applied.
3. **No Forbidden Predicates**: Rules do not reference coordinates, distance, time, signal, geocode, or observations.
4. **No Full Redetect/Cleanups**: Full redetect, selective purge, and MV refreshes are completely skipped as requested.

---

## 4. Next Queued Families

1. **Netgear Dual-Band (`6C:CD:D6`)**: Targeted delta <= 3 on byte 4 with same byte 6.
2. **Arcadyan HOME-EE7D (`xx:B0:66:EB:E1`)**: Custom local gateway admin MAC schemes.

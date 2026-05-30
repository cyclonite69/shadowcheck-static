# ShadowCheck Sibling-Rule Family Queue (2026-05-30)

This document outlines the ranked queue of manufacturer/OUI sibling candidates, establishing safety tiers and explicit transition boundaries.

---

## 1. Mined & Processed Candidate Queue

### Tier A — Approved & Implemented

- **Ubiquiti UniFi (`xx:E2:C6`)**:
  - _Classification_: Safe / Deterministic VAP chassis lock.
  - _Status_: Mined, isolated draft migration completed, and validated with integration tests.

---

## 2. Tier B — Queued for Deeper Audit

These families exhibit strong deterministic structures but are deferred to separate migrations to prevent bundled risk:

### 1. Mist Systems (`D4:20:B0` / `D4:DC:09`)

- _Priority_: High (12 manual overrides).
- _Task_: Verify site-correlation logs to ensure large last-octet deltas (up to 18) do not capture adjacent physical Mist installations.

### 2. GM Vehicle Hotspots (Complementary OUIs)

- _Priority_: High (42 manual overrides).
- _Task_: Group LG Innotek complement-OUI pairs into a dedicated vehicle hotspot migration file.

### 3. Comcast Vantiva (`C6:4F:D5`)

- _Priority_: Medium (6 manual overrides).
- _Task_: Verify exact rotating LAA allocation rules for Comcast residential gateway boxes.

### 4. Netgear Dual-Band (`6C:CD:D6`)

- _Priority_: Medium (1 manual override).
- _Task_: Validate byte-4 delta <= 3 pairing locks across similar residential router models.

### 5. Arcadyan HOME-EE7D (`xx:B0:66:EB:E1`)

- _Priority_: Low (1 manual override).
- _Task_: Validate Arcadyan-specific local admin MAC generation schemes.

---

## 3. Tier C — Rejected / Must Not Ship

These broad matching rules are rejected from generic implementation to prevent spatial scoring drift and false bridges:

1.  **General Rotating First-Octet**:
    - _Reason_: High overlap risk across standard multi-AP sequential deployments (e.g., Cisco/HPE/Hurley medical APs) where physical chassis are sequentially addressed. Convert strictly into OUI-specific prefix locks.
2.  **Home Gateway Class C Relaxation**:
    - _Reason_: Extending the universal Class C delta limit from 3 to 6 risks bridging sequentially addressed enterprise installations that happen to sit adjacent on a local network.
3.  **GL.iNet / Askey / Sagemcom Combined Block**:
    - _Reason_: Broad, multi-vendor aggregations must be avoided in favor of narrow, vendor-locked OUI filters.

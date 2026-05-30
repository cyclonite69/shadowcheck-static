# ShadowCheck Sibling-Rule Candidates & Collision-Risk Catalog (2026-05-30)

This catalog outlines the technical specifications of our Tier A candidates and presents a comprehensive collision-risk audit of broad MAC matching strategies.

---

## 1. Approved Tier A Candidate: Ubiquiti UniFi VAP Sibling Rule

### Specification & SQL Predicate

```sql
-- Ubiquiti UniFi VAP Sibling Rule:
-- Groups virtual APs (VAPs) and cross-band radios on the same physical Ubiquiti chassis (OUI xx:E2:C6).
-- Requires identical suffix (octets 5-6) and identical lower nibble of the fourth octet.
WHEN split_part(target_bssid, ':', 2) = 'E2' AND split_part(target_bssid, ':', 3) = 'C6'
  AND split_part(sibling_bssid, ':', 2) = 'E2' AND split_part(sibling_bssid, ':', 3) = 'C6'
  AND split_part(target_bssid, ':', 5) = split_part(sibling_bssid, ':', 5)
  AND split_part(target_bssid, ':', 6) = split_part(sibling_bssid, ':', 6)
  AND (('x' || split_part(target_bssid, ':', 4))::bit(8)::int & 15) = (('x' || split_part(sibling_bssid, ':', 4))::bit(8)::int & 15)
  THEN 'Ubiquiti UniFi VAP (Class A)'
```

- **MAC Predicates**: Suffix octets 5–6 match exactly. Fourth-octet lower nibbles (`bssid & 0x0F`) match exactly. Locked at bytes 2-3 to `E2:C6`.
- **Collision Risk Analysis**: **Negligible**. Because bytes 2-3 are locked to `E2:C6` (representing Ubiquiti's primary chipset identifier) and bytes 5-6 lock the chassis, this represents a hard 28-bit physical chassis identifier. There is zero risk of cross-talk across different physical installations.
- **SSID Dependency**: None. Purely MAC-structural.

---

## 2. Collision-Risk Audit: "General Rotating First-Octet Same-Chassis"

The "General Rotating First-Octet" rule groups _any_ two BSSIDs sharing identical bytes 2–6 with differing first octets. While mathematically elegant, a deep collision-risk audit reveals this rule is **unacceptable for generic production use** due to the following risks:

### A. Suffix Overlaps Across Unrelated Manufacturers

MAC address assignments are governed by the IEEE. The first 3 octets (OUI) represent the vendor, while bytes 4–6 are assigned sequentially or randomly.

- If we pair BSSIDs solely on bytes 2–6 matching, we are matching the last two octets of the OUI (`OUI[1]` and `OUI[2]`) + the entire vendor chassis allocation (`bytes 4–6`).
- Example:
  - Device A: `00:11:22:33:44:55` (OUI `00:11:22` = CIMSYS Inc.)
  - Device B: `02:11:22:33:44:55` (OUI `02:11:22` = LAA / Private locally-administered)
- If a local network has standard sequential devices (e.g. Cisco/HPE/Hurley medical APs) that happen to be sequentially numbered, a broad rotating first-octet rule would bridge them as same-chassis siblings, causing serious spatial threat scoring pollution.

### B. Standard Generic Sequences in Multi-AP Environments

In enterprise deployments, sequential APs are often assigned sequential MAC addresses.

- AP 1: `00:24:D7:9C:C6:B3`
- AP 2: `02:24:D7:9C:C6:B3`
- A generic rotating first-octet rule would bridge these two _completely different physical access points_ into a single virtual chassis, creating a **false bridge** that spans physical rooms, floors, or buildings.

### C. Recommendation

**Do not implement the Rotating First-Octet rule as a generic fallback.** Instead, convert it into narrow, vendor-specific rules where the rotating first octet is strictly gated by a verified OUI-specific prefix lock (e.g. Whiting Secured `7A/82:83:C2` or Xfinity `AA/AE/B6:DB:48`).

---

## 3. Tier B Candidate Narrowing Strategy

To safely ship Tier B rules in future migrations, we propose OUI-scoped structural bounds:

1.  **Mist Systems VAP**: Keep `octets_1_5_identical AND octet_6_delta <= 18` but lock strictly to registered global OUIs `D4:20:B0` and `D4:DC:09`.
2.  **Comcast Vantiva**: Gated strictly to OUI `C6:4F:D5`, same suffix byte 5, and byte 4 delta 0 or 7.
3.  **Netgear Dual-Band**: Gated strictly to OUI `6C:CD:D6`, identical last octet, and byte 4 delta <= 3.
4.  **Arcadyan HOME-EE7D**: Gated strictly to middle bytes `B0:66:EB:E1` and rotating first-octet `5C/7E/9E`.

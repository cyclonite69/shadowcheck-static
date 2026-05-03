# Flock Safety + Raven Detection Signature Catalog

**Source repository:** flock-you (colonelpanichacks/flock-you)
**Compiled:** 2026-05-03
**Purpose:** Complete detection signature reference for Shadowcheck integration. All signal types documented: WiFi OUI, BLE manufacturer ID, BLE service UUID, SSID pattern, firmware version fingerprint.

---

## 1. WiFi OUI List — @NitekryDPaul Research

Source: `datasets/NitekryDPaul_wifi_ouis.md`

# Flock Safety WiFi OUIs — Research by @NitekryDPaul

**Researcher:** ØяĐöØцяöЪöяцฐ (**@NitekryDPaul**)

This dataset documents Flock Safety and related surveillance-infrastructure WiFi MAC-address OUIs (first three octets) discovered through 2.4 GHz promiscuous-mode analysis. All 30 prefixes below were identified by @NitekryDPaul during his promiscuous-mode research on Flock camera air traffic.

## Why promiscuous mode

Flock stations spend most of their duty cycle asleep, waking briefly to upload and then sleeping again. During the sleep windows a passive sniffer will never see them transmit — but it can still see them named as the **destination** (addr1) of probe responses and data frames from nearby APs. Matching on addr1 in addition to addr2 therefore reveals devices that a transmitter-only sniff would miss entirely.

This addr1 technique is @NitekryDPaul's discovery and is the basis of the `promiscuis-flock-you` firmware.

## OUI list (31 prefixes, lowercase, colon-separated)

@NitekryDPaul contributed the first 30. The 31st (`82:6b:f2`) was contributed
by **Michael / DeFlockJoplin** during follow-up drive-testing in Joplin — it's
the OUI of the 12th camera in his field test, which the original list didn't
catch. See [DeflockJoplin/flock-you](https://github.com/DeflockJoplin/flock-you).

```
70:c9:4e
3c:91:80
d8:f3:bc
80:30:49
b8:35:32
14:5a:fc
74:4c:a1
08:3a:88
9c:2f:9d
c0:35:32
94:08:53
e4:aa:ea
f4:6a:dd
f8:a2:d6
24:b2:b9
00:f4:8d
d0:39:57
e8:d0:fc
e0:4f:43
b8:1e:a4
70:08:94
58:8e:81
ec:1b:bd
3c:71:bf
58:00:e3
90:35:ea
5c:93:a2
64:6e:69
48:27:ea
a4:cf:12
82:6b:f2
```

## CSV form

| oui      | vendor_context              | detection_protocol            | source                  |
| -------- | --------------------------- | ----------------------------- | ----------------------- |
| 70:c9:4e | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| 3c:91:80 | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| d8:f3:bc | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| 80:30:49 | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| b8:35:32 | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| 14:5a:fc | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| 74:4c:a1 | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| 08:3a:88 | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| 9c:2f:9d | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| c0:35:32 | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| 94:08:53 | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| e4:aa:ea | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| f4:6a:dd | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| f8:a2:d6 | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| 24:b2:b9 | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| 00:f4:8d | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| d0:39:57 | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| e8:d0:fc | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| e0:4f:43 | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| b8:1e:a4 | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| 70:08:94 | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| 58:8e:81 | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| ec:1b:bd | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| 3c:71:bf | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| 58:00:e3 | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| 90:35:ea | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| 5c:93:a2 | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| 64:6e:69 | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| 48:27:ea | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| a4:cf:12 | Flock Safety infrastructure | WiFi 2.4 GHz                  | @NitekryDPaul           |
| 82:6b:f2 | Flock Safety infrastructure | WiFi 2.4 GHz (wildcard probe) | Michael / DeFlockJoplin |

## Detection strategy

For each observed 802.11 management or data frame:

1. Skip if multicast (addr1 byte 0 bit 0 set) — filters broadcasts, 33:33:\* groups, etc.
2. Skip if locally-administered (byte 0 bit 1 set) — filters randomised MACs
3. Match `addr2` (transmitter) against the OUI list
4. Match `addr1` (receiver) against the OUI list — **the addr1 insight**
5. Optional: match `addr3` (BSSID) on mgmt frames when addr2 is randomised

### Wildcard-probe tightening (DeFlockJoplin)

Michael / DeFlockJoplin observed that Flock cameras channel-hop and spam
wildcard 802.11 Probe Requests on every channel. Combining that with the
OUI match yields a very tight signature:

1. Frame is Management, type=0 subtype=4 (Probe Request)
2. SSID Information Element (tag 0) is present with length 0
3. `addr2` (transmitter) matches the OUI list

Field-tested in Joplin: **11 of 12 cameras caught with only 2 false
positives**. The 12th camera used OUI `82:6b:f2`, which is now in the
list above. Source: [DeflockJoplin/flock-you](https://github.com/DeflockJoplin/flock-you).

## Firmware

The `promiscuis-flock-you` firmware implementing this research is a mod of @NitekryDPaul's promiscuous-mode firmware. It emits Flask-compatible JSON over USB for ingestion by the `flock-you` dashboard and persists detections to on-device SPIFFS.

## Credit

All OUI research and the promiscuous-mode detection strategy are the work of **@NitekryDPaul**. Please cite him when using or redistributing this list.

---

## 2. Flock Safety WiFi SSID + OUI Analysis

### 2.1 SSID Naming Conventions

Two observed formats, both WPA2 `infra` mode, channel varies (1/2/6/8/11/36/40/44/48/149/153/157/161/165):

- `Flock-XXXXXX` — 6 uppercase hex digits, e.g. `Flock-7F68FF` (primary format, ~95% of sightings)
- `FLOCK-XXXXXX` — all-uppercase prefix, e.g. `FLOCK-123DEF` (~5% of sightings)

The hex suffix is derived from the last 3 octets of the camera MAC address. For example MAC `14:5A:FC:86:4E:D3` → SSID `Flock-864ED3`. This means the SSID encodes the device identity.

Special/test SSIDs observed in the WiGLE dataset (not real deployments):

- `Flock-123456` — placeholder test value (5 sightings in Tampere, Finland, all locally-administered MACs)
- `Flock-ABCDEF`, `Flock-FEDCBA`, `Flock-A1B2C3` — synthetic test entries
- `Flock-654321` — synthetic test entry

### 2.2 OUI Frequency in WiGLE Wardriving Data (n=803 sightings)

From the full `Flock-_______20240530_124303.csv` dataset:

| OUI      | Count | Status                                                           |
| -------- | ----- | ---------------------------------------------------------------- |
| 74:4c:a1 | 169   | In firmware list                                                 |
| d8:f3:bc | 170   | In firmware list                                                 |
| 14:5a:fc | 80    | In firmware list                                                 |
| 80:30:49 | 67    | In firmware list                                                 |
| 3c:91:80 | 72    | In firmware list                                                 |
| e4:aa:ea | 72    | In firmware list                                                 |
| 94:08:53 | 32    | In firmware list                                                 |
| 08:3a:88 | 30    | In firmware list                                                 |
| b8:27:eb | 25    | NOT in list — Raspberry Pi Foundation (early prototype hardware) |
| 70:c9:4e | 24    | In firmware list                                                 |
| 9c:2f:9d | 12    | In firmware list                                                 |
| f4:6a:dd | 9     | In firmware list                                                 |
| e0:0a:f6 | 8     | NOT in list — unidentified vendor, possibly newer hardware       |
| f8:a2:d6 | 8     | In firmware list                                                 |
| d0:39:57 | 6     | In firmware list                                                 |
| 00:f4:8d | 7     | In firmware list                                                 |
| e8:d0:fc | 1     | In firmware list                                                 |
| 62:dd:4c | 1     | NOT in list — locally-administered/random (Fresno CA sighting)   |
| 86:a2:f4 | 1     | NOT in list — locally-administered/random (Finland test)         |
| 92:b7:dd | 1     | NOT in list — locally-administered/random (Finland)              |
| a2:a2:f4 | 2     | NOT in list — locally-administered/random (Finland test)         |
| a6:a2:f4 | 2     | NOT in list — locally-administered/random (Finland test)         |
| c0:c9:e3 | 1     | NOT in list — locally-administered/random (NV test entry)        |
| e4:c3:2a | 1     | NOT in list — locally-administered/random (OR test entry)        |
| e6:f4:c6 | 1     | NOT in list — locally-administered/random (OR test entry)        |

**Candidate new OUI to investigate: `e0:0a:f6`** — 8 sightings across Indiana (Indianapolis), Iowa, and California. Not locally-administered (bit 1 of byte 0 = 0). May represent a newer hardware generation.

**`b8:27:eb`** (Raspberry Pi Foundation) — 25 sightings, all with `bcninterval=7` (Pi-specific beacon interval). Early prototype/dev units. Not recommended for the firmware list as it would generate excessive false positives.

### 2.3 Geographic Coverage (from WiGLE dataset)

US States: AL, AZ, AR, CA, CO, FL, GA, IA, IL, IN, KS, KY, LA, MA, MD, MI, MN, MO, MS, NC, NE, NJ, NM, NV, NY, OH, OR, PA, RI, SC, TN, TX, UT, VA, WA, WI
International: FI (Finland, Tampere — test sightings only)

### 2.4 Complete Flock WiFi WiGLE Dataset

Source: `datasets/Flock-_______20240530_124303.csv` (803 data rows, captured 2024-05-30)

```csv
trilat,trilong,ssid,qos,transid,firsttime,lasttime,lastupdt,netid,name,type,comment,wep,bcninterval,freenet,dhcp,paynet,userfound,channel,rcois,encryption,country,region,road,city,housenumber,postalcode
26.13157845,-80.34389496,Flock-7F68FF,0,20210702-00000,2021-07-02T09:00:00.000Z,2021-07-02T10:00:00.000Z,2022-07-10T02:00:00.000Z,70:C9:4E:7F:68:FF,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,Sawgrass Expressway,Sunrise,,33325
26.18225288,-80.16497803,Flock-A4E7B7,0,20211107-00000,2021-11-07T12:00:00.000Z,2021-11-07T12:00:00.000Z,2021-11-07T12:00:00.000Z,3C:91:80:A4:E7:B7,,infra,,2,0,?,?,?,False,6,,wpa2,US,FL,West Prospect Road,Wilton Manors,,33309
26.30171204,-80.25123596,Flock-7DCB1D,0,20220112-00000,2022-01-12T15:00:00.000Z,2022-01-12T12:00:00.000Z,2022-01-12T12:00:00.000Z,D8:F3:BC:7D:CB:1D,,infra,,2,0,?,?,?,False,6,,wpa2,US,FL,Sawgrass Expressway,Parkland,,33076
26.61367226,-81.76228333,Flock-7F6395,0,20210102-00000,2021-01-02T16:00:00.000Z,2021-01-02T13:00:00.000Z,2022-07-06T18:00:00.000Z,70:C9:4E:7F:63:95,,infra,,2,0,?,?,?,False,6,,wpa2,US,FL,FL 82,Fort Myers,,33966-6536
27.32088089,-82.48295593,Flock-E05A6B,0,20210903-00000,2021-09-02T18:00:00.000Z,2021-09-03T22:00:00.000Z,2021-09-03T22:00:00.000Z,80:30:49:E0:5A:6B,,infra,,2,0,?,?,?,False,11,,wpa2,US,FL,McIntosh Road,,,34233
27.58609581,-80.3782196,Flock-7ACF3D,0,20220520-00000,2022-05-18T17:00:00.000Z,2022-05-20T16:00:00.000Z,2022-05-20T16:00:00.000Z,14:5A:FC:7A:CF:3D,,infra,,2,0,?,?,?,False,165,,wpa2,US,FL,9th Street Southwest,,915,32960
27.83551025,-82.26076508,Flock-68E7D5,0,20210912-00000,2021-09-12T13:00:00.000Z,2021-09-12T12:00:00.000Z,2021-09-12T12:00:00.000Z,74:4C:A1:68:E7:D5,,infra,,2,0,?,?,?,False,6,,wpa2,US,FL,Boyette Road,,15301,33569
27.87324142,-81.58193207,Flock-7DB7ED,0,20231223-00000,2022-02-27T13:00:00.000Z,2023-12-23T01:00:00.000Z,2023-12-23T02:00:00.000Z,D8:F3:BC:7D:B7:ED,,infra,,2,0,?,?,?,False,11,,wpa2,US,FL,South Scenic Highway,,,33898
27.89668083,-81.85842896,FLOCK-123DEF,5,20210513-00000,2021-05-12T11:00:00.000Z,2022-09-07T09:00:00.000Z,2022-09-07T09:00:00.000Z,08:3A:88:20:F8:04,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,FL 60,,,33830
27.90136719,-81.81982422,FLOCK-123DEF,4,20210513-00000,2021-05-12T11:00:00.000Z,2021-07-24T14:00:00.000Z,2022-07-06T16:00:00.000Z,08:3A:88:21:E0:88,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,FL 60,,,33830
27.91623688,-81.72180176,FLOCK-123DEF,4,20210513-00000,2021-05-12T11:00:00.000Z,2021-07-24T14:00:00.000Z,2022-07-06T20:00:00.000Z,08:3A:88:20:FB:04,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,FL 60,,,33820
27.91635323,-81.72721863,FLOCK-123DEF,2,20210513-00000,2021-05-12T11:00:00.000Z,2021-07-24T14:00:00.000Z,2022-07-06T20:00:00.000Z,08:3A:88:20:FC:AC,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,FL 60,,,33820
27.91641998,-81.72706604,Flock-21D4DF,0,20210716-00000,2021-04-15T21:00:00.000Z,2021-07-16T10:00:00.000Z,2022-07-06T20:00:00.000Z,80:30:49:21:D4:DF,,infra,,2,0,?,?,?,False,6,,wpa2,US,FL,FL 60,,,33820
27.91646004,-82.73600769,Flock-7DC483,0,20220127-00000,2022-01-26T20:00:00.000Z,2022-01-27T17:00:00.000Z,2022-01-27T17:00:00.000Z,D8:F3:BC:7D:C4:83,,infra,,2,0,?,?,?,False,11,,wpa2,US,FL,East Bay Drive,Largo,,33764
27.91680717,-81.72693634,FLOCK-21DD56,7,20221023-00000,2022-10-22T21:00:00.000Z,2024-05-30T00:00:00.000Z,2024-05-30T00:00:00.000Z,08:3A:88:21:DD:56,,infra,,2,0,?,?,?,False,1,0,wpa2,US,FL,FL 60,,,
27.92337227,-81.82196045,Flock-621591,3,20221022-00000,2022-10-22T04:00:00.000Z,2023-02-14T07:00:00.000Z,2023-02-14T07:00:00.000Z,9C:2F:9D:62:15:91,,infra,,2,0,?,?,?,False,40,,wpa2,US,FL,US 17,,,33830
27.92378998,-81.82167053,FLOCK-123DEF,2,20210715-00000,2021-07-15T19:00:00.000Z,2022-09-07T09:00:00.000Z,2022-12-24T14:00:00.000Z,08:3A:88:20:F6:70,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,US 17,,,33830
27.92728806,-82.05605316,FLOCK-215E46,0,20210821-00000,2021-08-21T13:00:00.000Z,2021-08-21T12:00:00.000Z,2022-07-06T06:00:00.000Z,08:3A:88:21:5E:46,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,FL 60,Brandon,,
27.92729187,-82.05556488,FLOCK-217604,0,20210821-00000,2021-08-21T13:00:00.000Z,2021-08-21T12:00:00.000Z,2022-07-06T06:00:00.000Z,08:3A:88:21:76:04,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,FL 60,Brandon,,
27.9276371,-82.05514526,FLOCK-2168AC,2,20211004-00000,2021-10-04T14:00:00.000Z,2022-09-07T09:00:00.000Z,2022-09-07T09:00:00.000Z,08:3A:88:21:68:AC,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,South County Line Road,,,
27.92777061,-82.05553436,FLOCK-21DA14,2,20211004-00000,2021-10-04T14:00:00.000Z,2022-09-07T09:00:00.000Z,2022-09-07T09:00:00.000Z,08:3A:88:21:DA:14,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,South County Line Road,,,
27.9524231,-81.86958313,FLOCK-123DEF,5,20210606-00000,2021-06-06T11:00:00.000Z,2021-09-27T13:00:00.000Z,2021-09-27T13:00:00.000Z,08:3A:88:20:F8:06,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,Bartow Road,,,33846
27.95244217,-81.86980438,FLOCK-123DEF,6,20210712-00000,2001-11-26T09:00:00.000Z,2022-09-07T09:00:00.000Z,2022-09-07T09:00:00.000Z,08:3A:88:21:8A:3C,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,Bartow Road,,,33846
27.953022,-81.87052917,FLOCK-2169DA,0,20211010-00000,2021-10-10T12:00:00.000Z,2021-10-10T12:00:00.000Z,2021-10-10T12:00:00.000Z,08:3A:88:21:69:DA,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,Boy Scout Ranch Road,,,33846
27.95305252,-81.87051392,FLOCK-123DEF,7,20210606-00000,2021-06-06T11:00:00.000Z,2022-09-07T09:00:00.000Z,2022-09-07T09:00:00.000Z,08:3A:88:20:F6:00,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,Boy Scout Ranch Road,,,33846
27.95329666,-81.87008667,FLOCK-216972,0,20211010-00000,2021-10-10T14:00:00.000Z,2021-10-10T12:00:00.000Z,2021-10-10T12:00:00.000Z,08:3A:88:21:69:72,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,Bartow Road,,,33846
27.96147156,-82.69564819,Flock-3D14C5,2,20210810-00000,2021-08-10T11:00:00.000Z,2021-11-17T11:00:00.000Z,2021-11-17T11:00:00.000Z,D8:F3:BC:3D:14:C5,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,Courtney Campbell Causeway,Clearwater,,33759
27.96562576,-82.82230377,Flock-7DC979,6,20210623-00000,2021-06-23T17:00:00.000Z,2022-06-04T11:00:00.000Z,2022-06-04T12:00:00.000Z,D8:F3:BC:7D:C9:79,,infra,,2,0,?,?,?,False,11,,wpa2,US,FL,Gulf Blvd,Clearwater,598,33767
27.9673748,-82.72731781,Flock-809C79,1,20210821-00000,2021-08-21T11:00:00.000Z,2021-08-22T16:00:00.000Z,2021-08-22T16:00:00.000Z,E4:AA:EA:80:9C:79,,infra,,2,0,?,?,?,False,11,,wpa2,US,FL,Drew Street,Clearwater,,33755
27.96786308,-82.72770691,Flock-7DBD4D,0,20231228-00000,2023-12-28T17:00:00.000Z,2023-12-28T12:00:00.000Z,2023-12-28T12:00:00.000Z,D8:F3:BC:7D:BD:4D,,infra,,2,0,?,?,?,False,6,,wpa2,US,FL,Drew Street,Clearwater,,33755
27.96808624,-82.72968292,Flock-7DC5D3,0,20210821-00000,2021-08-21T11:00:00.000Z,2021-08-21T17:00:00.000Z,2022-07-05T07:00:00.000Z,D8:F3:BC:7D:C5:D3,,infra,,2,0,?,?,?,False,6,,wpa2,US,FL,US 19,Clearwater,,33764
27.97340584,-82.76313782,Flock-BDCA83,0,20211005-00000,2021-10-05T14:00:00.000Z,2021-10-05T12:00:00.000Z,2021-10-05T12:00:00.000Z,3C:91:80:BD:CA:83,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,North Keene Road,Clearwater,,33755
27.99047852,-82.73105621,Flock-7DCA81,2,20210821-00000,2021-08-21T11:00:00.000Z,2021-08-30T12:00:00.000Z,2021-08-30T12:00:00.000Z,D8:F3:BC:7D:CA:81,,infra,,2,0,?,?,?,False,11,,wpa2,US,FL,Sunset Point Road,Clearwater,,33763-3921
27.99593925,-82.7631073,Flock-7EB073,4,20211011-00000,2021-10-08T13:00:00.000Z,2021-10-23T14:00:00.000Z,2021-10-23T14:00:00.000Z,74:4C:A1:7E:B0:73,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,North Keene Road,Clearwater,2064,33755
27.99737549,-82.77506256,Flock-7EBF95,0,20211127-00000,2021-11-27T16:00:00.000Z,2021-11-27T14:00:00.000Z,2021-11-27T14:00:00.000Z,74:4C:A1:7E:BF:95,,infra,,2,0,?,?,?,False,6,,wpa2,US,FL,Union Street,Clearwater,900,34698
28.01925087,-82.72465515,Flock-7DCC29,0,20210807-00000,2021-08-07T17:00:00.000Z,2021-08-07T14:00:00.000Z,2022-07-05T08:00:00.000Z,D8:F3:BC:7D:CC:29,,infra,,2,0,?,?,?,False,11,,wpa2,US,FL,State Road 580,Clearwater,,34677
28.02204132,-82.70923615,Flock-3D185B,1,20220124-00000,2022-01-23T16:00:00.000Z,2022-01-30T04:00:00.000Z,2022-01-30T04:00:00.000Z,D8:F3:BC:3D:18:5B,,infra,,2,0,?,?,?,False,11,,wpa2,US,FL,McMullen Booth Road,Clearwater,,33766
28.02215958,-82.70909882,Flock-7DBBB7,0,20211216-00000,2021-12-03T13:00:00.000Z,2021-12-16T14:00:00.000Z,2021-12-16T14:00:00.000Z,D8:F3:BC:7D:BB:B7,,infra,,2,0,?,?,?,False,6,,wpa2,US,FL,McMullen Booth Road,Clearwater,,33766
28.02561569,-81.63418579,Flock-3D11A9,0,20220615-00000,2022-06-15T12:00:00.000Z,2022-06-15T10:00:00.000Z,2022-06-15T11:00:00.000Z,D8:F3:BC:3D:11:A9,,infra,,2,0,?,?,?,False,44,,wpa2,US,FL,US 27,,,33884-1191
28.05707741,-81.81793213,FLOCK-2165EC,0,20210715-00000,2021-07-15T19:00:00.000Z,2021-07-15T17:00:00.000Z,2022-07-06T16:00:00.000Z,08:3A:88:21:65:EC,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,US 92,,,33823
28.0571537,-81.81716156,FLOCK-215A86,0,20210715-00000,2021-07-15T19:00:00.000Z,2021-07-15T17:00:00.000Z,2022-07-06T16:00:00.000Z,08:3A:88:21:5A:86,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,US 92,,2301,33823
28.05722809,-81.81642151,FLOCK-123DEF,0,20210715-00000,2021-07-15T19:00:00.000Z,2021-07-15T17:00:00.000Z,2022-07-06T16:00:00.000Z,08:3A:88:20:F1:40,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,US 92,,,33823
28.06919479,-82.4132843,Flock-91E4B1,0,20220708-00000,2022-07-08T17:00:00.000Z,2022-07-08T16:00:00.000Z,2022-07-08T18:00:00.000Z,14:5A:FC:91:E4:B1,,infra,,2,0,?,?,?,False,149,,wpa2,US,FL,East Fletcher Avenue,Brandon,4398,33613
28.07207489,-81.98786926,FLOCK-215A56,7,20210622-00000,2021-06-22T02:00:00.000Z,2022-01-06T12:00:00.000Z,2022-01-06T12:00:00.000Z,08:3A:88:21:5A:56,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,I 4,Lakeland,,33815
28.07359886,-81.98653412,FLOCK-218FC4,6,20210622-00000,2021-06-22T02:00:00.000Z,2022-01-06T17:00:00.000Z,2022-01-06T17:00:00.000Z,08:3A:88:21:8F:C4,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,I 4,Lakeland,,33815
28.07885742,-80.64001465,Flock-7EBD49,0,20220225-00000,2022-02-16T22:00:00.000Z,2022-02-25T13:00:00.000Z,2022-02-25T13:00:00.000Z,74:4C:A1:7E:BD:49,,infra,,2,0,?,?,?,False,6,,wpa2,US,FL,New Haven Avenue,,1151,32904
28.11030388,-81.73121643,FLOCK-123DEF,0,20210804-00000,2021-08-04T11:00:00.000Z,2021-08-04T17:00:00.000Z,2022-07-06T19:00:00.000Z,08:3A:88:20:F4:0C,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,CR 557,,8991,33850
28.15329361,-81.80119324,FLOCK-218A52,0,20211126-00000,2021-11-26T21:00:00.000Z,2021-11-26T21:00:00.000Z,2021-11-26T21:00:00.000Z,08:3A:88:21:8A:52,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,FL 559,,,33854
28.18539619,-82.66663361,Flock-7DC875,5,20210808-00000,2021-08-08T14:00:00.000Z,2021-08-20T04:00:00.000Z,2022-07-05T09:00:00.000Z,D8:F3:BC:7D:C8:75,,infra,,2,0,?,?,?,False,11,,wpa2,US,FL,Little Road,,,34655
28.19303322,-82.0005722,FLOCK-21ACEA,0,20211113-00000,2021-11-12T09:00:00.000Z,2021-11-13T19:00:00.000Z,2021-11-13T19:00:00.000Z,08:3A:88:21:AC:EA,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,Rockridge Road,,10559,33809
28.23596001,-81.65206909,FLOCK-215C1A,7,20220221-00000,2022-02-21T12:00:00.000Z,2024-05-06T15:00:00.000Z,2024-05-08T15:00:00.000Z,08:3A:88:21:5C:1A,,infra,,2,0,?,?,?,False,1,0,wpa2,US,FL,US 27,,,33896
28.23654938,-81.65227509,FLOCK-217258,7,20220221-00000,2022-02-21T12:00:00.000Z,2024-05-06T15:00:00.000Z,2024-05-06T17:00:00.000Z,08:3A:88:21:72:58,,infra,,2,0,?,?,?,False,1,0,wpa2,US,FL,US 27,,,33896
28.33526039,-81.67144775,Flock-6FEC2D,0,20220402-00000,2022-04-02T18:00:00.000Z,2022-04-02T19:00:00.000Z,2022-04-02T19:00:00.000Z,14:5A:FC:6F:EC:2D,,infra,,2,0,?,?,?,False,6,,wpa2,US,FL,US 27,,,33897
28.8517952,-81.61499786,Flock-7DCB6F,0,20210814-00000,2021-08-14T16:00:00.000Z,2021-08-14T10:00:00.000Z,2022-07-07T02:00:00.000Z,D8:F3:BC:7D:CB:6F,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,FL 44,,20673,32736
29.56828499,-98.56190491,Flock-3D1781,1,20210813-00000,2021-08-13T09:00:00.000Z,2021-09-30T08:00:00.000Z,2023-09-27T16:00:00.000Z,D8:F3:BC:3D:17:81,,infra,,2,0,?,?,?,False,6,,wpa2,US,TX,Cinnamon Oak,,,78230
29.56915092,-90.3730545,Flock-865229,0,20220712-00000,2002-11-25T11:00:00.000Z,2022-07-12T16:00:00.000Z,2022-07-13T02:00:00.000Z,14:5A:FC:86:52:29,,infra,,2,0,?,?,?,False,157,,wpa2,US,LA,East Main Street,,,70373
29.61950874,-82.3839798,Flock-86533D,0,20220424-00000,2022-04-24T16:00:00.000Z,2022-04-24T14:00:00.000Z,2022-04-24T14:00:00.000Z,14:5A:FC:86:53:3D,,infra,,2,0,?,?,?,False,6,,wpa2,US,FL,Southwest 40th Boulevard,Gainesville,3792,32608
29.6209774,-95.63022614,Flock-127CDF,1,20210512-00000,2021-05-12T17:00:00.000Z,2021-05-31T17:00:00.000Z,2022-07-23T17:00:00.000Z,80:30:49:12:7C:DF,,infra,,2,0,?,?,?,False,1,,wpa2,US,TX,US 90 Alternate,Sugar Land,,77478
29.63767433,-98.47147369,Flock-3D1933,1,20211120-00000,2021-04-24T17:00:00.000Z,2021-11-20T03:00:00.000Z,2021-11-20T03:00:00.000Z,D8:F3:BC:3D:19:33,,infra,,2,0,?,?,?,False,11,,wpa2,US,TX,Evans Road,San Antonio,,78258
29.70425987,-95.47607422,Flock-893359,0,20211203-00000,2021-12-02T18:00:00.000Z,2021-12-03T22:00:00.000Z,2021-12-03T22:00:00.000Z,74:4C:A1:89:33:59,,infra,,2,0,?,?,?,False,6,,wpa2,US,TX,Chimney Rock Road,Houston,,77402
29.75018311,-95.49242401,Flock-68E1B3,2,20240502-00000,2024-05-02T16:00:00.000Z,2024-05-14T05:00:00.000Z,2024-05-14T05:00:00.000Z,74:4C:A1:68:E1:B3,,infra,,2,0,?,?,?,False,44,0,wpa2,US,TX,San Felipe Street,Houston,,77057
29.78121185,-90.83940887,Flock-7DBD79,0,20220224-00000,2021-08-19T16:00:00.000Z,2022-02-24T18:00:00.000Z,2022-02-24T18:00:00.000Z,D8:F3:BC:7D:BD:79,,infra,,2,0,?,?,?,False,6,,wpa2,US,LA,Tiger Drive,,,70301
29.78261757,-95.81030273,Flock-564F77,4,20200825-00000,2020-08-25T13:00:00.000Z,2021-01-14T09:00:00.000Z,2022-07-22T20:00:00.000Z,E4:AA:EA:56:4F:77,,infra,,2,0,?,?,?,False,11,,wpa2,US,TX,Katy Freeway,,,77493
29.78390503,-95.49353027,Flock-3D1F01,5,20210509-00000,2021-05-08T21:00:00.000Z,2022-02-02T07:00:00.000Z,2022-02-02T08:00:00.000Z,D8:F3:BC:3D:1F:01,,infra,,2,0,?,?,?,False,11,,wpa2,US,TX,Katy Freeway,Spring Valley,8525,77055
29.78439713,-95.52755737,Flock-564B9D,0,20210921-00000,2021-09-21T18:00:00.000Z,2021-09-21T21:00:00.000Z,2021-09-21T21:00:00.000Z,E4:AA:EA:56:4B:9D,,infra,,2,0,?,?,?,False,6,,wpa2,US,TX,Katy Tollway,Houston,,77055-6476
29.78448486,-90.81789398,Flock-3D1F87,0,20210817-00000,2021-08-17T12:00:00.000Z,2021-08-17T19:00:00.000Z,2022-08-09T16:00:00.000Z,D8:F3:BC:3D:1F:87,,infra,,2,0,?,?,?,False,1,,wpa2,US,LA,Saint Charles Street,,,70301
29.78481483,-95.5428009,Flock-426F89,0,20230606-00000,2023-06-06T12:00:00.000Z,2023-06-06T12:00:00.000Z,2023-06-06T12:00:00.000Z,F4:6A:DD:42:6F:89,,infra,,2,0,?,?,?,False,157,,wpa2,US,TX,Katy Freeway,Houston,,77055-6476
29.82832336,-94.82079315,Flock-80A09B,6,20201013-00000,2020-10-11T18:00:00.000Z,2021-09-01T18:00:00.000Z,2021-09-01T19:00:00.000Z,E4:AA:EA:80:A0:9B,,infra,,2,0,?,?,?,False,11,,wpa2,US,TX,East Freeway,Baytown,15126,77523
29.88930511,-95.58240509,Flock-91EA3F,0,20220531-00000,2022-05-31T19:00:00.000Z,2022-05-31T18:00:00.000Z,2022-05-31T18:00:00.000Z,14:5A:FC:91:EA:3F,,infra,,2,0,?,?,?,False,36,,wpa2,US,TX,Northwest Freeway Frontage Road,,,77065:77429
29.894907,-90.09566498,Flock-7DD4AD,0,20230123-00000,2023-01-23T14:00:00.000Z,2023-01-23T12:00:00.000Z,2023-01-23T12:00:00.000Z,D8:F3:BC:7D:D4:AD,,infra,,2,0,?,?,?,False,48,,wpa2,US,LA,Westbank Expressway,,4515,70072
29.90249634,-95.60120392,Flock-895DE5,0,20220421-00000,2022-04-19T13:00:00.000Z,2022-04-21T10:00:00.000Z,2022-04-21T10:00:00.000Z,74:4C:A1:89:5D:E5,,infra,,2,0,?,?,?,False,11,,wpa2,US,TX,Northwest Freeway Frontage Road,,,77065:77429
30.0039196,-90.18518829,Flock-7DC5C7,0,20210722-00000,2021-07-22T12:00:00.000Z,2021-07-22T18:00:00.000Z,2022-08-11T02:00:00.000Z,D8:F3:BC:7D:C5:C7,,infra,,2,0,?,?,?,False,6,,wpa2,US,LA,Clearview Parkway,,,70006
30.02189636,-95.57138824,Flock-623409,1,20210807-00000,2021-08-07T19:00:00.000Z,2021-10-20T07:00:00.000Z,2021-10-20T07:00:00.000Z,00:F4:8D:62:34:09,,infra,,2,0,?,?,?,False,6,,wpa2,US,TX,Spring Cypress Road,,,77379
30.02284431,-95.57007599,Flock-3D20CD,1,20211018-00000,2021-10-03T21:00:00.000Z,2021-10-18T20:00:00.000Z,2021-10-18T20:00:00.000Z,D8:F3:BC:3D:20:CD,,infra,,2,0,?,?,?,False,6,,wpa2,US,TX,Spring Cypress Road,,9799,77379
30.05464554,-89.94773865,Flock-BFE877,0,20210303-00000,2021-03-03T13:00:00.000Z,2021-03-03T15:00:00.000Z,2022-06-22T21:00:00.000Z,3C:91:80:BF:E8:77,,infra,,2,0,?,?,?,False,1,,wpa2,US,LA,I 10,New Orleans,,70128
30.22424889,-85.8717804,Flock-7EBD55,0,20220628-00000,2022-06-28T14:00:00.000Z,2022-06-28T12:00:00.000Z,2022-06-28T16:00:00.000Z,74:4C:A1:7E:BD:55,,infra,,2,0,?,?,?,False,48,,wpa2,US,FL,Panama City Beach Parkway,,,32413
30.22676849,-97.72636414,Flock-28151B,0,20210704-00000,2021-07-04T12:00:00.000Z,2021-07-04T11:00:00.000Z,2022-07-14T20:00:00.000Z,94:08:53:28:15:1B,,infra,,2,0,?,?,?,False,1,,wpa2,US,TX,East Oltorf Street,Austin,,78741
30.25076866,-92.01385498,Flock-7DB97F,0,20210912-00000,2021-09-02T07:00:00.000Z,2021-09-12T20:00:00.000Z,2021-09-12T23:00:00.000Z,D8:F3:BC:7D:B9:7F,,infra,,2,0,?,?,?,False,6,,wpa2,US,LA,Northwest Evangeline Thruway,Lafayette,,70501
30.26645851,-85.9783783,Flock-96953B,0,20220629-00000,2022-06-29T10:00:00.000Z,2022-06-29T09:00:00.000Z,2022-06-29T09:00:00.000Z,14:5A:FC:96:95:3B,,infra,,2,0,?,?,?,False,40,,wpa2,US,FL,Back Beach Road,,23001,32413
30.28085327,-81.49193573,Flock-3D1879,3,20210420-00000,2021-04-19T14:00:00.000Z,2021-05-06T15:00:00.000Z,2022-07-07T12:00:00.000Z,D8:F3:BC:3D:18:79,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,Kernan Boulevard South,Jacksonville,4098,32224
30.29105949,-98.02305603,Flock-BDC6FD,0,20201112-00000,2020-11-12T12:00:00.000Z,2020-11-12T15:00:00.000Z,2022-07-13T00:00:00.000Z,3C:91:80:BD:C6:FD,,infra,,2,0,?,?,?,False,6,,wpa2,US,TX,Hamilton Pool Road,,,78738
30.29451942,-98.01552582,Flock-E05AD7,0,20210427-00000,2021-04-27T09:00:00.000Z,2021-04-27T16:00:00.000Z,2022-07-13T00:00:00.000Z,80:30:49:E0:5A:D7,,infra,,2,0,?,?,?,False,1,,wpa2,US,TX,Hamilton Pool Road,,,78738
30.30814362,-97.74043274,Flock-68E203,0,20210806-00000,2021-08-06T11:00:00.000Z,2021-08-06T15:00:00.000Z,2022-07-14T11:00:00.000Z,74:4C:A1:68:E2:03,,infra,,W,0,?,?,?,False,1,,wpa,US,TX,North Lamar Boulevard,Austin,,78756
30.30911255,-97.92002869,Flock-BAEF77,1,20200914-00000,2020-09-14T13:00:00.000Z,2021-05-04T13:00:00.000Z,2022-07-13T04:00:00.000Z,3C:91:80:BA:EF:77,,infra,,2,0,?,?,?,False,11,,wpa2,US,TX,Resaca Boulevard,,,
30.31047058,-97.91625214,Flock-BACD3B,0,20210504-00000,2021-05-04T12:00:00.000Z,2021-05-04T13:00:00.000Z,2022-07-13T05:00:00.000Z,3C:91:80:BA:CD:3B,,infra,,2,0,?,?,?,False,11,,wpa2,US,TX,Bee Caves Road,,,78733
30.31544685,-95.46896362,Flock-3D2027,0,20210528-00000,2021-05-10T07:00:00.000Z,2021-05-28T08:00:00.000Z,2022-07-25T03:00:00.000Z,D8:F3:BC:3D:20:27,,infra,,2,0,?,?,?,False,11,,wpa2,US,TX,West Dallas Street,,1188,77301
30.31661224,-95.47190094,Flock-3D16C5,0,20210613-00000,2021-06-12T15:00:00.000Z,2021-06-13T04:00:00.000Z,2022-07-25T03:00:00.000Z,D8:F3:BC:3D:16:C5,,infra,,2,0,?,?,?,False,1,,wpa2,US,TX,Interstate 45 North,,,77301
30.3475914,-86.20697021,Flock-80A0F5,0,20200926-00000,2020-09-26T08:00:00.000Z,2020-09-26T08:00:00.000Z,2022-06-28T10:00:00.000Z,E4:AA:EA:80:A0:F5,,infra,,2,0,?,?,?,False,6,,wpa2,US,FL,Timpoochee Trail,,,32459
30.39315414,-91.01865387,Flock-892799,1,20220201-00000,2022-01-25T11:00:00.000Z,2022-02-12T07:00:00.000Z,2022-02-12T07:00:00.000Z,74:4C:A1:89:27:99,,infra,,2,0,?,?,?,False,1,,wpa2,US,LA,,,,70817
30.39562225,-88.75753784,Flock-7DBE03,0,20211009-00000,2021-10-09T01:00:00.000Z,2021-10-09T17:00:00.000Z,2021-10-09T17:00:00.000Z,D8:F3:BC:7D:BE:03,,infra,,2,0,?,?,?,False,1,,wpa2,US,MS,Old Spanish Trail,,8901,39564
30.39705658,-95.68084717,Flock-6FE567,0,20220520-00000,2022-05-20T13:00:00.000Z,2022-05-20T21:00:00.000Z,2022-05-20T21:00:00.000Z,14:5A:FC:6F:E5:67,,infra,,2,0,?,?,?,False,48,,wpa2,US,TX,Lone Star Parkway,,975,77356
30.41158676,-91.07852173,Flock-893523,0,20220101-00000,2021-12-15T17:00:00.000Z,2022-01-01T03:00:00.000Z,2022-01-01T04:00:00.000Z,74:4C:A1:89:35:23,,infra,,2,0,?,?,?,False,6,,wpa2,US,LA,Bluebonnet Boulevard,,,70810
30.4166832,-91.0898819,Flock-969AF9,1,20220702-00000,2022-06-24T07:00:00.000Z,2022-07-27T16:00:00.000Z,2022-07-27T17:00:00.000Z,14:5A:FC:96:9A:F9,,infra,,2,0,?,?,?,False,149,,wpa2,US,LA,Drusilla Drive,Baton Rouge,,70809
30.41734695,-91.06556702,Flock-7DD4D3,1,20210612-00000,2021-06-07T18:00:00.000Z,2021-09-01T17:00:00.000Z,2021-09-01T17:00:00.000Z,D8:F3:BC:7D:D4:D3,,infra,,2,0,?,?,?,False,1,,wpa2,US,LA,Coursey Boulevard,Baton Rouge,,70816
30.41735077,-91.06462097,Flock-BDBF9F,1,20201223-00000,2020-12-13T21:00:00.000Z,2021-03-22T04:00:00.000Z,2022-08-09T09:00:00.000Z,3C:91:80:BD:BF:9F,,infra,,2,0,?,?,?,False,1,,wpa2,US,LA,Coursey Boulevard,Baton Rouge,,70816
30.42600632,-91.06954956,Flock-7ACD5F,0,20220727-00000,2022-07-25T07:00:00.000Z,2022-07-27T16:00:00.000Z,2022-07-27T17:00:00.000Z,14:5A:FC:7A:CD:5F,,infra,,2,0,?,?,?,False,44,,wpa2,US,LA,West Florida Republic Parkway,Baton Rouge,,70809-2591
30.42614365,-91.01165771,Flock-8C7351,0,20220212-00000,2022-02-10T14:00:00.000Z,2022-02-12T07:00:00.000Z,2022-02-12T07:00:00.000Z,74:4C:A1:8C:73:51,,infra,,2,0,?,?,?,False,11,,wpa2,US,LA,South Harrell's Ferry Road,Baton Rouge,,70813
30.44410133,-91.02453613,Flock-28131D,0,20220911-00000,2022-09-09T16:00:00.000Z,2022-09-11T03:00:00.000Z,2022-09-11T03:00:00.000Z,94:08:53:28:13:1D,,infra,,2,0,?,?,?,False,1,,wpa2,US,LA,Millerville Road,,,70816
30.44471169,-91.02440643,Flock-3D0B2D,5,20210901-00000,2021-09-01T15:00:00.000Z,2022-05-28T09:00:00.000Z,2022-05-28T09:00:00.000Z,D8:F3:BC:3D:0B:2D,,infra,,2,0,?,?,?,False,40,,wpa2,US,LA,Millerville Road,,,70816
30.44471931,-91.0243988,Flock-91E483,0,20220724-00000,2022-07-21T11:00:00.000Z,2022-07-24T08:00:00.000Z,2022-07-24T08:00:00.000Z,14:5A:FC:91:E4:83,,infra,,2,0,?,?,?,False,153,,wpa2,US,LA,Millerville Road,,,70816
30.44560051,-91.03414154,Flock-3D2631,1,20210522-00000,2021-05-17T17:00:00.000Z,2021-12-13T06:00:00.000Z,2021-12-13T06:00:00.000Z,D8:F3:BC:3D:26:31,,infra,,2,0,?,?,?,False,6,,wpa2,US,LA,Old Hammond Highway,Baton Rouge,13300,70816
30.45005226,-86.63847351,Flock-6FE9B5,1,20220411-00000,2022-04-11T12:00:00.000Z,2022-05-16T17:00:00.000Z,2022-05-16T17:00:00.000Z,14:5A:FC:6F:E9:B5,,infra,,2,0,?,?,?,False,48,,wpa2,US,FL,Beal Parkway Northwest,,,32547
30.45723152,-88.89154816,Flock-809D69,0,20211125-00000,2021-07-21T13:00:00.000Z,2021-11-25T10:00:00.000Z,2021-11-25T10:00:00.000Z,E4:AA:EA:80:9D:69,,infra,,2,0,?,?,?,False,1,,wpa2,US,MS,Lamey Bridge Road,,11513,39532
30.52329063,-84.353508,Flock-7DCAE1,0,20220131-00000,2022-01-31T19:00:00.000Z,2022-01-31T12:00:00.000Z,2022-01-31T12:00:00.000Z,D8:F3:BC:7D:CA:E1,,infra,,2,0,?,?,?,False,1,,wpa2,US,FL,,,,
30.52411461,-84.35403442,Flock-B2336F,0,20201212-00000,2001-04-28T14:00:00.000Z,2020-12-12T12:00:00.000Z,2022-07-02T06:00:00.000Z,3C:91:80:B2:33:6F,,infra,,2,0,?,?,?,False,6,,wpa2,US,FL,North Monroe Street,,,
30.53598213,-86.4924469,Flock-68DB75,0,20220305-00000,2022-02-22T16:00:00.000Z,2022-03-05T11:00:00.000Z,2022-03-05T11:00:00.000Z,74:4C:A1:68:DB:75,,infra,,2,0,?,?,?,False,11,,wpa2,US,FL,FL 85,,,32580
31.84640121,-86.64713287,Flock-3D17B3,0,20220407-00000,2022-04-07T13:00:00.000Z,2022-04-07T17:00:00.000Z,2022-04-07T17:00:00.000Z,D8:F3:BC:3D:17:B3,,infra,,2,0,?,?,?,False,11,,wpa2,US,AL,I 65,,,V0C 2W0
31.98235512,-81.13027954,Flock-0C3EFC,0,20191007-00000,2019-10-07T14:00:00.000Z,2019-10-07T13:00:00.000Z,2022-07-08T11:00:00.000Z,B8:27:EB:0C:3E:FC,,infra,,2,0,?,?,?,False,7,,wpa2,US,GA,White Bluff Road,Savannah,,31419
31.9825325,-81.13034058,Flock-7EBB9D,0,20220624-00000,2022-06-23T12:00:00.000Z,2022-06-24T12:00:00.000Z,2022-06-24T14:00:00.000Z,74:4C:A1:7E:BB:9D,,infra,,2,0,?,?,?,False,40,,wpa2,US,GA,White Bluff Road,Savannah,,31406-4805
31.99701309,-81.25901031,Flock-127B4F,0,20210329-00000,2021-03-29T22:00:00.000Z,2021-03-29T20:00:00.000Z,2022-07-08T02:00:00.000Z,80:30:49:12:7B:4F,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,Ogeechee Road,,,31419
32.03353119,-81.25320435,Flock-127A87,0,20201026-00000,2020-10-26T19:00:00.000Z,2020-10-26T17:00:00.000Z,2022-07-08T02:00:00.000Z,80:30:49:12:7A:87,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Quacco Road,,,31416
32.03361893,-81.25327301,Flock-7DCB31,0,20210515-00000,2021-05-15T19:00:00.000Z,2021-05-15T20:00:00.000Z,2022-07-08T02:00:00.000Z,D8:F3:BC:7D:CB:31,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Quacco Road,,,31416
32.04101562,-81.02329254,Flock-809ED5,0,20200723-00000,2020-07-23T16:00:00.000Z,2020-07-23T18:00:00.000Z,2022-07-08T18:00:00.000Z,E4:AA:EA:80:9E:D5,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,US 80;GA 26,,,31410
32.04653931,-81.2636795,Flock-80A22F,0,20200922-00000,2020-09-22T17:00:00.000Z,2020-09-22T18:00:00.000Z,2022-07-08T02:00:00.000Z,E4:AA:EA:80:A2:2F,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Quacco Road,,,31416
32.05371094,-81.079422,Flock-21D2D9,0,20210213-00000,2021-02-14T00:00:00.000Z,2021-02-13T21:00:00.000Z,2022-07-08T15:00:00.000Z,80:30:49:21:D2:D9,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,East 35th Street,Savannah,1298,31404
32.14108276,-81.24153137,Flock-7DC8DB,0,20210808-00000,2021-08-07T09:00:00.000Z,2021-08-08T13:00:00.000Z,2022-07-08T03:00:00.000Z,D8:F3:BC:7D:C8:DB,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Pooler Parkway,,,31322
32.14515686,-81.24060822,Flock-7EB28F,0,20220114-00000,2022-01-14T21:00:00.000Z,2022-01-14T19:00:00.000Z,2022-01-14T19:00:00.000Z,74:4C:A1:7E:B2:8F,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,I 95,,,31322
32.22172165,-81.19592285,Flock-3D21F3,0,20211026-00000,2021-10-26T18:00:00.000Z,2021-10-26T16:00:00.000Z,2021-10-26T16:00:00.000Z,D8:F3:BC:3D:21:F3,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Augusta Road,,,
32.39916611,-90.14084625,Flock-892697,0,20220128-00000,2022-01-27T12:00:00.000Z,2022-01-28T17:00:00.000Z,2022-01-28T17:00:00.000Z,74:4C:A1:89:26:97,,infra,,2,0,?,?,?,False,1,,wpa2,US,MS,Ridgewood Road,Jackson,,39211
32.39947891,-90.14047241,Flock-7DB81F,0,20220602-00000,2022-06-02T12:00:00.000Z,2022-06-02T11:00:00.000Z,2022-06-02T11:00:00.000Z,D8:F3:BC:7D:B8:1F,,infra,,2,0,?,?,?,False,165,,wpa2,US,MS,East County Line Road,Jackson,,39157
32.39976883,-90.14093781,Flock-67732D,0,20221018-00000,2022-10-18T12:00:00.000Z,2022-10-18T10:00:00.000Z,2022-10-18T10:00:00.000Z,94:08:53:67:73:2D,,infra,,2,0,?,?,?,False,161,,wpa2,US,MS,East County Line Road,,,39157
32.49745178,-82.92790222,Flock-809975,0,20210224-00000,2021-02-24T18:00:00.000Z,2021-02-24T19:00:00.000Z,2022-07-05T02:00:00.000Z,E4:AA:EA:80:99:75,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,US 319;US 441;GA 31;GA 117,,,31021
32.52928925,-82.94449615,Flock-7EC927,0,20220311-00000,2022-03-11T19:00:00.000Z,2022-04-06T13:00:00.000Z,2022-04-06T13:00:00.000Z,74:4C:A1:7E:C9:27,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Industrial Boulevard,,,31021
32.54338455,-82.89463043,Flock-BDAE0D,0,20200628-00000,2020-06-28T23:00:00.000Z,2020-06-28T23:00:00.000Z,2022-07-05T03:00:00.000Z,3C:91:80:BD:AE:0D,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,East Jackson Street,,,31021
32.60771561,-97.11692047,Flock-3D156D,0,20220628-00000,2022-06-28T20:00:00.000Z,2022-06-28T18:00:00.000Z,2022-06-28T22:00:00.000Z,D8:F3:BC:3D:15:6D,,infra,,2,0,?,?,?,False,36,,wpa2,US,TX,Matlock Road,,,76002
32.67242432,-96.98540497,Flock-809AC7,0,20210530-00000,2021-05-30T16:00:00.000Z,2021-05-30T19:00:00.000Z,2022-07-18T17:00:00.000Z,E4:AA:EA:80:9A:C7,,infra,,2,0,?,?,?,False,1,,wpa2,US,TX,Ronald Reagan Memorial Highway,Grand Prairie,,75052
32.70510864,-97.23324585,Flock-8925EB,2,20211114-00000,2021-11-13T15:00:00.000Z,2021-12-15T18:00:00.000Z,2021-12-15T18:00:00.000Z,74:4C:A1:89:25:EB,,infra,,2,0,?,?,?,False,6,,wpa2,US,TX,I 820,Fort Worth,,76119
32.70898819,-97.23110962,Flock-7ECD01,2,20211114-00000,2021-11-13T15:00:00.000Z,2021-12-15T18:00:00.000Z,2021-12-15T18:00:00.000Z,74:4C:A1:7E:CD:01,,infra,,2,0,?,?,?,False,6,,wpa2,US,TX,I 820,Fort Worth,,76119
32.71066666,-97.23018646,Flock-89338B,0,20211215-00000,2021-12-14T16:00:00.000Z,2021-12-15T18:00:00.000Z,2021-12-15T18:00:00.000Z,74:4C:A1:89:33:8B,,infra,,2,0,?,?,?,False,1,,wpa2,US,TX,I 820,Fort Worth,,76119
32.7404213,-96.4099884,Flock-7EB633,3,20211221-00000,2021-12-21T19:00:00.000Z,2022-01-17T08:00:00.000Z,2022-01-17T08:00:00.000Z,74:4C:A1:7E:B6:33,,infra,,2,0,?,?,?,False,1,,wpa2,US,TX,US 80,,,75126
32.76968765,-97.35532379,Flock-A4EDCD,0,20210530-00000,2021-05-29T22:00:00.000Z,2021-05-30T00:00:00.000Z,2022-07-17T01:00:00.000Z,3C:91:80:A4:ED:CD,,infra,,2,0,?,?,?,False,6,,wpa2,US,TX,Grand Avenue,Fort Worth,1214,76106
32.7732811,-117.01608276,Flock-7F5E7D,0,20210618-00000,2021-06-18T13:00:00.000Z,2021-06-18T14:00:00.000Z,2022-07-04T05:00:00.000Z,70:C9:4E:7F:5E:7D,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Mission Valley Freeway,,,91942
32.78311539,-79.95996094,Flock-809B29,0,20211028-00000,2021-10-25T08:00:00.000Z,2021-10-28T05:00:00.000Z,2021-10-28T05:00:00.000Z,E4:AA:EA:80:9B:29,,infra,,2,0,?,?,?,False,1,,wpa2,US,SC,Savannah Highway,Charleston,,29425
32.78472519,-97.38305664,Flock-3D2459,0,20220111-00000,2022-01-10T18:00:00.000Z,2022-01-11T04:00:00.000Z,2022-01-11T04:00:00.000Z,D8:F3:BC:3D:24:59,,infra,,2,0,?,?,?,False,1,,wpa2,US,TX,River Oaks Boulevard,Fort Worth,4301,76114
32.78995895,-97.35279846,Flock-2812E5,3,20210219-00000,2021-02-17T15:00:00.000Z,2021-07-12T20:00:00.000Z,2022-07-17T01:00:00.000Z,94:08:53:28:12:E5,,infra,,2,0,?,?,?,False,6,,wpa2,US,TX,Clinton Avenue,Fort Worth,2506,76164
32.79760742,-97.29066467,Flock-3D166F,0,20211129-00000,2021-11-29T22:00:00.000Z,2021-11-29T20:00:00.000Z,2021-11-29T21:00:00.000Z,D8:F3:BC:3D:16:6F,,infra,,2,0,?,?,?,False,1,,wpa2,US,TX,North Beach Street,,2921,76137
32.8099823,-96.46581268,Flock-7ECE55,0,20220616-00000,2022-01-30T19:00:00.000Z,2022-06-16T17:00:00.000Z,2022-06-16T18:00:00.000Z,74:4C:A1:7E:CE:55,,infra,,2,0,?,?,?,False,6,,wpa2,US,TX,Maverick Drive,,3001,75126
32.81547165,-97.41928101,Flock-625A19,0,20240512-00000,2024-05-06T21:00:00.000Z,2024-05-12T16:00:00.000Z,2024-05-12T18:00:00.000Z,9C:2F:9D:62:5A:19,,infra,,2,0,?,?,?,False,153,0,wpa2,US,TX,Azle Avenue,,,76135
32.8248024,-97.38930511,Flock-A4E321,0,20200930-00000,2020-09-30T15:00:00.000Z,2020-09-30T19:00:00.000Z,2022-07-16T17:00:00.000Z,3C:91:80:A4:E3:21,,infra,,2,0,?,?,?,False,1,,wpa2,US,TX,Jim Wright Freeway,Fort Worth,,76106
32.85536957,-96.56637573,Flock-12240D,0,20180529-00000,2018-05-27T15:00:00.000Z,2018-05-29T06:00:00.000Z,2022-07-21T00:00:00.000Z,B8:27:EB:12:24:0D,,infra,,2,0,?,?,?,False,7,,wpa2,US,TX,Stirling Drive,Garland,,75043
32.86431122,-96.69942474,Flock-6235E1,0,20210317-00000,2020-10-10T21:00:00.000Z,2021-03-17T21:00:00.000Z,2022-07-20T10:00:00.000Z,00:F4:8D:62:35:E1,,infra,,2,0,?,?,?,False,6,,wpa2,US,TX,East Northwest Highway,Dallas,10717,75218
32.8809967,-97.3970871,Flock-BAE77B,0,20201202-00000,2020-12-01T17:00:00.000Z,2020-12-02T19:00:00.000Z,2022-07-16T16:00:00.000Z,3C:91:80:BA:E7:7B,,infra,,2,0,?,?,?,False,6,,wpa2,US,TX,West Bailey Boswell Road,Fort Worth,4809,76179
32.90818405,-84.33017731,Flock-7EB665,0,20220623-00000,2022-06-23T04:00:00.000Z,2022-06-23T02:00:00.000Z,2022-06-23T02:00:00.000Z,74:4C:A1:7E:B6:65,,infra,,2,0,?,?,?,False,44,,wpa2,US,GA,North Church Street,,,30286
32.91269302,-96.71796417,Flock-324545,0,20200503-00000,2020-05-03T13:00:00.000Z,2020-05-03T15:00:00.000Z,2022-07-20T06:00:00.000Z,B8:27:EB:32:45:45,,infra,,2,0,?,?,?,False,7,,wpa2,US,TX,Ridgepoint,Dallas,,75243
32.91811371,-79.82910919,Flock-BDB03D,1,20210523-00000,2021-05-23T15:00:00.000Z,2021-05-27T15:00:00.000Z,2022-07-11T15:00:00.000Z,3C:91:80:BD:B0:3D,,infra,,2,0,?,?,?,False,6,,wpa2,US,SC,SC 41,,,29466
32.92137527,-79.82823944,Flock-895CA9,0,20220222-00000,2022-02-03T16:00:00.000Z,2022-02-22T02:00:00.000Z,2022-02-22T02:00:00.000Z,74:4C:A1:89:5C:A9,,infra,,2,0,?,?,?,False,11,,wpa2,US,SC,SC 41,,,29453
32.94599915,-96.90529633,Flock-7EB565,0,20220117-00000,2022-01-16T20:00:00.000Z,2022-01-17T08:00:00.000Z,2022-01-17T08:00:00.000Z,74:4C:A1:7E:B5:65,,infra,,2,0,?,?,?,False,6,,wpa2,US,TX,South Stemmons Freeway,,,75234:75235
32.99585342,-96.9931488,Flock-896153,0,20220225-00000,2022-02-25T16:00:00.000Z,2022-02-25T15:00:00.000Z,2022-02-25T15:00:00.000Z,74:4C:A1:89:61:53,,infra,,2,0,?,?,?,False,1,,wpa2,US,TX,East Vista Ridge Mall Drive,,,75057
33.01314545,-96.99291992,Flock-564F25,0,20210516-00000,2021-05-16T12:00:00.000Z,2021-05-16T12:00:00.000Z,2022-07-18T17:00:00.000Z,E4:AA:EA:56:4F:25,,infra,,2,0,?,?,?,False,6,,wpa2,US,TX,South Business 121,Lewisville,,75057
33.0135498,-97.04974365,Flock-89854B,0,20220310-00000,2022-03-10T19:00:00.000Z,2022-03-10T18:00:00.000Z,2022-03-10T18:00:00.000Z,74:4C:A1:89:85:4B,,infra,,2,0,?,?,?,False,1,,wpa2,US,TX,Flower Mound Road,,1337,75028
33.05674744,-96.816185,Flock-3D1499,0,20211217-00000,2021-12-17T19:00:00.000Z,2021-12-17T17:00:00.000Z,2021-12-17T17:00:00.000Z,D8:F3:BC:3D:14:99,,infra,,2,0,?,?,?,False,1,,wpa2,US,TX,Windhaven Parkway,Plano,,75093
33.19838333,-117.37532806,Flock-969771,0,20220708-00000,2022-07-08T13:00:00.000Z,2022-07-08T17:00:00.000Z,2022-07-08T19:00:00.000Z,14:5A:FC:96:97:71,,infra,,2,0,?,?,?,False,44,,wpa2,US,CA,Mission Avenue,Oceanside,,92054
33.20015717,-117.38303375,Flock-7DD0A7,0,20220123-00000,2022-01-22T22:00:00.000Z,2022-01-23T03:00:00.000Z,2022-01-23T03:00:00.000Z,D8:F3:BC:7D:D0:A7,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,North Coast Highway,Oceanside,624,92054
33.28220749,-86.80608368,Flock-7DCEC3,0,20210516-00000,2021-05-16T18:00:00.000Z,2021-05-16T17:00:00.000Z,2022-06-27T09:00:00.000Z,D8:F3:BC:7D:CE:C3,,infra,,2,0,?,?,?,False,6,,wpa2,US,AL,County Road 52,,4851,35124
33.30347061,-84.53588104,Flock-3D1FAB,0,20210602-00000,2021-06-02T22:00:00.000Z,2021-06-02T17:00:00.000Z,2022-07-01T09:00:00.000Z,D8:F3:BC:3D:1F:AB,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,GA 74;GA 85,,3001,30276
33.31567764,-86.82267761,Flock-564FBB,2,20201115-00000,2020-11-15T20:00:00.000Z,2020-12-16T08:00:00.000Z,2022-06-27T08:00:00.000Z,E4:AA:EA:56:4F:BB,,infra,,2,0,?,?,?,False,1,,wpa2,US,AL,Helena Road,,,35244
33.31742477,-86.78179169,Flock-80A10D,0,20210425-00000,2021-04-25T14:00:00.000Z,2021-04-25T12:00:00.000Z,2022-06-27T12:00:00.000Z,E4:AA:EA:80:A1:0D,,infra,,2,0,?,?,?,False,11,,wpa2,US,AL,John Findley Drive,,,35124
33.34766769,-86.80144501,Flock-127B0F,0,20210112-00000,2021-01-12T17:00:00.000Z,2021-01-12T17:00:00.000Z,2022-06-27T10:00:00.000Z,80:30:49:12:7B:0F,,infra,,2,0,?,?,?,False,6,,wpa2,US,AL,Old Montgomery Highway,Hoover,1900,35244
33.34886932,-86.79441833,Flock-21D43D,0,20200921-00000,2020-09-21T15:00:00.000Z,2020-09-21T13:00:00.000Z,2022-06-27T11:00:00.000Z,80:30:49:21:D4:3D,,infra,,2,0,?,?,?,False,1,,wpa2,US,AL,Southpark Drive,Hoover,,35244
33.34913254,-86.78796387,Flock-809B3D,1,20201202-00000,2020-10-18T18:00:00.000Z,2020-12-02T19:00:00.000Z,2022-06-27T12:00:00.000Z,E4:AA:EA:80:9B:3D,,infra,,2,0,?,?,?,False,6,,wpa2,US,AL,Valleydale Road,Hoover,,35124
33.36314392,-111.83956146,Flock-809BE5,0,20210315-00000,2021-03-15T16:00:00.000Z,2021-03-27T16:00:00.000Z,2022-07-08T02:00:00.000Z,E4:AA:EA:80:9B:E5,,infra,,2,0,?,?,?,False,11,,wpa2,US,AZ,West Obispo Avenue,Gilbert,2350,85233
33.37815475,-111.96601868,Flock-21D185,0,20220131-00000,2022-01-31T20:00:00.000Z,2022-01-31T19:00:00.000Z,2022-01-31T19:00:00.000Z,80:30:49:21:D1:85,,infra,,2,0,?,?,?,False,11,,wpa2,US,AZ,West Baseline Road,Gilbert,1801,85283
33.37835312,-111.96289062,Flock-809BA1,0,20210312-00000,2021-03-12T11:00:00.000Z,2021-03-12T11:00:00.000Z,2022-07-07T05:00:00.000Z,E4:AA:EA:80:9B:A1,,infra,,2,0,?,?,?,False,6,,wpa2,US,AZ,West Baseline Road,Tempe,1424,85283
33.37888336,-111.96735382,Flock-21CF4D,4,20210121-00000,2021-01-21T10:00:00.000Z,2021-09-01T18:00:00.000Z,2021-09-01T19:00:00.000Z,80:30:49:21:CF:4D,,infra,,2,0,?,?,?,False,1,,wpa2,US,AZ,Maricopa Freeway,Tempe,,85283-1045
33.39679718,-84.7420578,Flock-7DCF3D,0,20210810-00000,2021-07-04T17:00:00.000Z,2021-08-10T18:00:00.000Z,2022-06-30T23:00:00.000Z,D8:F3:BC:7D:CF:3D,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,GA 34,,,30277
33.41275787,-86.80525208,Flock-565163,0,20210723-00000,2021-07-23T15:00:00.000Z,2021-07-23T14:00:00.000Z,2022-06-27T10:00:00.000Z,E4:AA:EA:56:51:63,,infra,,2,0,?,?,?,False,11,,wpa2,US,AL,Montgomery Highway,Hoover,,35216-3607
33.41533279,-86.8276062,Flock-809E7B,0,20200722-00000,2020-07-22T19:00:00.000Z,2020-07-22T17:00:00.000Z,2022-06-27T08:00:00.000Z,E4:AA:EA:80:9E:7B,,infra,,2,0,?,?,?,False,6,,wpa2,US,AL,Tyler Road,Hoover,2398,35226
33.42857742,-84.45842743,Flock-80A067,0,20200929-00000,2020-09-29T22:00:00.000Z,2020-09-29T17:00:00.000Z,2022-07-01T18:00:00.000Z,E4:AA:EA:80:A0:67,,infra,,2,0,?,?,?,False,7,,wpa2,US,GA,Glynn Street South,,903,30215
33.44021988,-86.77008057,Flock-E05A2F,0,20210725-00000,2021-07-18T18:00:00.000Z,2021-07-25T16:00:00.000Z,2021-08-30T15:00:00.000Z,80:30:49:E0:5A:2F,,infra,,2,0,?,?,?,False,1,,wpa2,US,AL,Cedardell Lane,,1248,35216
33.44775772,-84.51933289,Flock-68DDDD,0,20211124-00000,2021-11-23T16:00:00.000Z,2021-11-24T08:00:00.000Z,2021-11-24T09:00:00.000Z,74:4C:A1:68:DD:DD,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,West Lanier Avenue,,,
33.44783401,-86.82338715,Flock-896013,0,20220602-00000,2022-05-31T15:00:00.000Z,2022-06-02T16:00:00.000Z,2022-06-02T17:00:00.000Z,74:4C:A1:89:60:13,,infra,,2,0,?,?,?,False,44,,wpa2,US,AL,Wildwood Parkway,,,335209
33.45191193,-86.78768921,Flock-8C748B,0,20220319-00000,2022-03-19T17:00:00.000Z,2022-03-19T15:00:00.000Z,2022-03-19T15:00:00.000Z,74:4C:A1:8C:74:8B,,infra,,2,0,?,?,?,False,1,,wpa2,US,AL,Montgomery Highway,,,35209
33.46228027,-112.49970245,Flock-E05981,0,20220717-00000,2022-07-16T09:00:00.000Z,2022-07-17T11:00:00.000Z,2022-07-17T11:00:00.000Z,80:30:49:E0:59:81,,infra,,2,0,?,?,?,False,165,,wpa2,US,AZ,Pearl Harbor Memorial Highway,Buckeye,,
33.46346664,-86.98072052,Flock-7DB7DF,0,20220602-00000,2021-10-20T21:00:00.000Z,2022-06-02T16:00:00.000Z,2022-06-02T16:00:00.000Z,D8:F3:BC:7D:B7:DF,,infra,,2,0,?,?,?,False,6,,wpa2,US,AL,Forest Road,,635,35023
33.46442032,-84.2175293,Flock-281583,0,20210919-00000,2021-09-19T12:00:00.000Z,2021-09-19T09:00:00.000Z,2021-09-19T09:00:00.000Z,94:08:53:28:15:83,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,Jonesboro Road,,,30228
33.46481323,-86.75722504,Flock-7DC5C5,0,20210802-00000,2021-07-30T18:00:00.000Z,2021-08-02T12:00:00.000Z,2022-06-27T14:00:00.000Z,D8:F3:BC:7D:C5:C5,,infra,,2,0,?,?,?,False,6,,wpa2,US,AL,US 280,Mountain Brook,,35243
33.48400497,-86.78072357,Flock-21D499,0,20201003-00000,2020-10-03T17:00:00.000Z,2020-10-03T15:00:00.000Z,2022-06-27T12:00:00.000Z,80:30:49:21:D4:99,,infra,,2,0,?,?,?,False,11,,wpa2,US,AL,,Birmingham,,35025
33.48419952,-117.66770935,Flock-68E4BD,2,20211223-00000,2021-12-23T14:00:00.000Z,2022-07-12T15:00:00.000Z,2022-07-13T00:00:00.000Z,74:4C:A1:68:E4:BD,,infra,,2,0,?,?,?,False,36,,wpa2,US,CA,San Diego Freeway,,,92675
33.48519516,-117.6667099,Flock-BFDF69,0,20210625-00000,2021-06-25T09:00:00.000Z,2021-06-25T19:00:00.000Z,2022-07-02T18:00:00.000Z,3C:91:80:BF:DF:69,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,San Diego Freeway,,,92675
33.50074387,-117.15223694,Flock-7EBA47,0,20211218-00000,2021-12-18T12:00:00.000Z,2021-12-18T16:00:00.000Z,2021-12-18T16:00:00.000Z,74:4C:A1:7E:BA:47,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Rancho California Road,Temecula,,92530-2703
33.50183105,-84.37394714,Flock-127C85,0,20200930-00000,2020-09-30T02:00:00.000Z,2020-09-30T18:00:00.000Z,2022-07-02T03:00:00.000Z,80:30:49:12:7C:85,,infra,,2,0,?,?,?,False,5,,wpa2,US,GA,Fayetteville Road,,,30238
33.50288773,-86.77742004,Flock-281685,0,20220602-00000,2021-09-28T16:00:00.000Z,2022-06-02T16:00:00.000Z,2022-06-02T16:00:00.000Z,94:08:53:28:16:85,,infra,,2,0,?,?,?,False,1,,wpa2,US,AL,Altamont Road,Birmingham,,35025
33.50341034,-86.7868042,Flock-8098FB,0,20210501-00000,2021-03-24T18:00:00.000Z,2021-05-01T20:00:00.000Z,2022-06-27T12:00:00.000Z,E4:AA:EA:80:98:FB,,infra,,2,0,?,?,?,False,6,,wpa2,US,AL,26th Street South,Birmingham,1199,35205
33.50450134,-86.79524231,Flock-3D1CD9,0,20210621-00000,2021-06-15T17:00:00.000Z,2021-06-21T14:00:00.000Z,2022-06-27T11:00:00.000Z,D8:F3:BC:3D:1C:D9,,infra,,2,0,?,?,?,False,1,,wpa2,US,AL,22nd Street South,Birmingham,906,35205
33.50516129,-86.79112244,Flock-3D242B,0,20210501-00000,2021-03-24T18:00:00.000Z,2021-05-01T20:00:00.000Z,2022-06-27T11:00:00.000Z,D8:F3:BC:3D:24:2B,,infra,,2,0,?,?,?,False,6,,wpa2,US,AL,10th Avenue South,Birmingham,2455,35205
33.50526428,-86.79172516,Flock-68E66D,0,20220602-00000,2021-10-15T16:00:00.000Z,2022-06-02T16:00:00.000Z,2022-06-02T16:00:00.000Z,74:4C:A1:68:E6:6D,,infra,,2,0,?,?,?,False,11,,wpa2,US,AL,10th Avenue South,Birmingham,2411,35205
33.50599289,-86.76152039,Flock-80A223,0,20210501-00000,2021-03-10T16:00:00.000Z,2021-05-01T20:00:00.000Z,2022-06-27T14:00:00.000Z,E4:AA:EA:80:A2:23,,infra,,2,0,?,?,?,False,1,,wpa2,US,AL,Memory Lane,Mountain Brook,2,35213
33.50666809,-84.23113251,Flock-677C65,0,20220430-00000,2022-04-29T22:00:00.000Z,2022-04-30T17:00:00.000Z,2022-04-30T17:00:00.000Z,94:08:53:67:7C:65,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,I 75,,,30228:30281
33.50681686,-86.7950592,Flock-3D24B7,1,20210621-00000,2021-06-09T16:00:00.000Z,2021-08-30T15:00:00.000Z,2021-08-30T15:00:00.000Z,D8:F3:BC:3D:24:B7,,infra,,2,0,?,?,?,False,11,,wpa2,US,AL,23rd Street South,Birmingham,793,35205
33.50699997,-86.79334259,Flock-BDAA65,0,20220602-00000,2021-10-23T19:00:00.000Z,2022-06-02T16:00:00.000Z,2022-06-02T17:00:00.000Z,3C:91:80:BD:AA:65,,infra,,2,0,?,?,?,False,6,,wpa2,US,AL,24th Street South,Birmingham,855,35205
33.50736237,-86.79413605,Flock-F0AB50,0,20210310-00000,2021-01-05T17:00:00.000Z,2021-03-10T14:00:00.000Z,2022-06-27T11:00:00.000Z,B8:27:EB:F0:AB:50,,infra,,2,0,?,?,?,False,7,,wpa2,US,AL,University Boulevard,Birmingham,,35233
33.5083847,-86.7576828,Flock-BFE9DD,0,20210310-00000,2021-01-22T15:00:00.000Z,2021-05-01T20:00:00.000Z,2022-06-27T14:00:00.000Z,3C:91:80:BF:E9:DD,,infra,,2,0,?,?,?,False,1,,wpa2,US,AL,Montclair Road,Mountain Brook,3937,35213
33.5093956,-84.44815826,Flock-62350F,0,20200929-00000,2020-09-28T20:00:00.000Z,2020-09-29T05:00:00.000Z,2022-07-01T19:00:00.000Z,00:F4:8D:62:35:0F,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,West Fayetteville Road,,717,30214
33.50999069,-86.78727722,Flock-864FD3,0,20220609-00000,2022-06-08T11:00:00.000Z,2022-06-09T09:00:00.000Z,2022-06-09T09:00:00.000Z,14:5A:FC:86:4F:D3,,infra,,2,0,?,?,?,False,44,,wpa2,US,AL,University Boulevard,Birmingham,2801,35233
33.52030945,-101.99702454,Flock-E0577B,0,20210227-00000,2021-02-09T20:00:00.000Z,2021-02-27T00:00:00.000Z,2022-07-11T21:00:00.000Z,80:30:49:E0:57:7B,,infra,,2,0,?,?,?,False,6,,wpa2,US,TX,Cambridge Drive,,,79382
33.52481461,-117.16021729,Flock-892E8D,0,20211114-00000,2021-11-14T08:00:00.000Z,2021-11-14T09:00:00.000Z,2021-11-14T09:00:00.000Z,74:4C:A1:89:2E:8D,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,Ynez Road,Temecula,,92591
33.52503586,-86.66453552,Flock-6CA7F6,0,20200210-00000,2020-01-22T18:00:00.000Z,2020-02-10T03:00:00.000Z,2022-06-27T20:00:00.000Z,B8:27:EB:6C:A7:F6,,infra,,2,0,?,?,?,False,7,,wpa2,US,AL,Grants Mill Road,,,35210
33.53643417,-111.92559814,Flock-3D13F5,0,20211018-00000,2021-10-18T18:00:00.000Z,2021-10-18T18:00:00.000Z,2021-10-18T18:00:00.000Z,D8:F3:BC:3D:13:F5,,infra,,2,0,?,?,?,False,11,,wpa2,US,AZ,North Scottsdale Road,Scottsdale,6701,85250
33.53730774,-111.92567444,Flock-BDB093,0,20200925-00000,2020-09-25T07:00:00.000Z,2020-09-25T11:00:00.000Z,2022-07-07T12:00:00.000Z,3C:91:80:BD:B0:93,,infra,,2,0,?,?,?,False,1,,wpa2,US,AZ,North Scottsdale Road,Scottsdale,,85250
33.56092834,-86.52149963,Flock-809FA5,0,20220617-00000,2022-04-25T19:00:00.000Z,2022-06-17T00:00:00.000Z,2022-06-17T00:00:00.000Z,E4:AA:EA:80:9F:A5,,infra,,2,0,?,?,?,False,11,,wpa2,US,AL,Whitfield Avenue,,,35123
33.56587982,-85.04519653,Flock-893533,0,20211217-00000,2021-12-17T08:00:00.000Z,2021-12-17T06:00:00.000Z,2021-12-17T06:00:00.000Z,74:4C:A1:89:35:33,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,,,,30116:30117
33.57044983,-117.70032501,Flock-7EBF2F,0,20220618-00000,2022-06-18T17:00:00.000Z,2022-06-18T17:00:00.000Z,2022-06-18T17:00:00.000Z,74:4C:A1:7E:BF:2F,,infra,,2,0,?,?,?,False,44,,wpa2,US,CA,Moulton Parkway,,27051,92656
33.57781601,-86.47731781,Flock-3D172D,0,20210721-00000,2021-07-20T21:00:00.000Z,2021-07-21T00:00:00.000Z,2022-06-28T03:00:00.000Z,D8:F3:BC:3D:17:2D,,infra,,2,0,?,?,?,False,11,,wpa2,US,AL,I 20,,,35004
33.57910156,-117.6725769,Flock-8984E1,0,20211223-00000,2021-12-20T13:00:00.000Z,2021-12-23T23:00:00.000Z,2022-05-08T19:00:00.000Z,74:4C:A1:89:84:E1,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Camino Capistrano,Mission Viejo,26801,92690-9998
33.58632278,-83.87728882,Flock-864CDF,0,20220806-00000,2022-06-30T08:00:00.000Z,2022-08-06T06:00:00.000Z,2022-08-06T06:00:00.000Z,14:5A:FC:86:4C:DF,,infra,,2,0,?,?,?,False,40,,wpa2,US,GA,Washington Street Southwest,,,30014
33.59715271,-117.6774826,Flock-7DC3BB,2,20210822-00000,2021-08-22T17:00:00.000Z,2021-11-17T14:00:00.000Z,2021-11-17T14:00:00.000Z,D8:F3:BC:7D:C3:BB,,infra,,2,0,?,?,?,False,10,,wpa2,US,CA,La Paz Road,,25201,92653
33.60050964,-86.65116882,Flock-7DC95D,0,20211024-00000,2021-10-23T20:00:00.000Z,2021-10-24T00:00:00.000Z,2021-10-24T00:00:00.000Z,D8:F3:BC:7D:C9:5D,,infra,,2,0,?,?,?,False,11,,wpa2,US,AL,Edwards Lake Road,Birmingham,,35235
33.61203384,-117.69645691,Flock-7F683B,0,20210318-00000,2021-03-18T18:00:00.000Z,2021-03-18T18:00:00.000Z,2022-07-02T17:00:00.000Z,70:C9:4E:7F:68:3B,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Los Alisos Boulevard,,,92630
33.6143837,-83.83113861,Flock-3D1B27,0,20210708-00000,2021-07-08T14:00:00.000Z,2021-07-08T15:00:00.000Z,2022-07-03T09:00:00.000Z,D8:F3:BC:3D:1B:27,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,I 20,,,30015
33.61503601,-117.26229858,Flock-969E45,0,20220720-00000,2022-07-20T15:00:00.000Z,2022-07-20T18:00:00.000Z,2022-07-20T19:00:00.000Z,14:5A:FC:96:9E:45,,infra,,2,0,?,?,?,False,44,,wpa2,US,CA,Temecula Valley Freeway,,,92595
33.61611938,-117.70600891,Flock-BDCBE5,1,20210406-00000,2021-04-06T19:00:00.000Z,2022-01-24T18:00:00.000Z,2022-01-24T18:00:00.000Z,3C:91:80:BD:CB:E5,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,El Toro Road,,23861,92630
33.62182617,-84.50301361,Flock-3D2133,0,20210509-00000,2021-05-09T09:00:00.000Z,2021-05-09T19:00:00.000Z,2022-07-01T13:00:00.000Z,D8:F3:BC:3D:21:33,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Roosevelt Highway,,3505,30349
33.62511063,-117.68691254,Flock-A4E4B5,0,20210726-00000,2021-07-26T16:00:00.000Z,2021-07-26T16:00:00.000Z,2022-07-02T17:00:00.000Z,3C:91:80:A4:E4:B5,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Jeronimo Road,,25393,92630
33.62627411,-117.72028351,Flock-C0A475,0,20220719-00000,2022-07-19T17:00:00.000Z,2022-07-19T17:00:00.000Z,2022-07-19T17:00:00.000Z,E0:0A:F6:C0:A4:75,,infra,,2,0,?,?,?,False,153,,wpa2,US,CA,South Pointe Drive,Laguna Hills,23461,92653
33.62739944,-117.72241974,Flock-864A11,0,20220723-00000,2022-07-23T13:00:00.000Z,2022-07-23T13:00:00.000Z,2022-07-23T15:00:00.000Z,14:5A:FC:86:4A:11,,infra,,2,0,?,?,?,False,44,,wpa2,US,CA,Avenida De La Carlota,Laguna Hills,23046,92653
33.62802505,-117.72434998,Flock-3D1843,1,20220206-00000,2022-02-06T17:00:00.000Z,2022-04-16T13:00:00.000Z,2022-04-16T13:00:00.000Z,D8:F3:BC:3D:18:43,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Lake Forest Drive,,23000,92653
33.6288414,-117.71776581,Flock-A4F5E7,2,20210410-00000,2021-04-10T15:00:00.000Z,2021-10-10T13:00:00.000Z,2021-10-10T13:00:00.000Z,3C:91:80:A4:F5:E7,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,Lake Forest Drive,,,92637
33.62903595,-117.71743011,Flock-80A30B,0,20210410-00000,2021-04-10T17:00:00.000Z,2021-04-10T17:00:00.000Z,2022-07-02T16:00:00.000Z,E4:AA:EA:80:A3:0B,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,Lake Forest Drive,,,92637
33.62905502,-117.72412109,Flock-68E04D,5,20210729-00000,2021-07-29T17:00:00.000Z,2022-05-23T17:00:00.000Z,2022-05-23T17:00:00.000Z,74:4C:A1:68:E0:4D,,infra,,2,0,?,?,?,False,40,,wpa2,US,CA,Lake Forest Drive,,,92637
33.62923431,-117.72831726,Flock-892DA7,0,20220420-00000,2022-04-20T20:00:00.000Z,2022-04-20T23:00:00.000Z,2022-04-21T00:00:00.000Z,74:4C:A1:89:2D:A7,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,Lake Forest Drive,,,92637
33.62937927,-117.72949982,Flock-3D15EF,0,20211111-00000,2021-11-11T17:00:00.000Z,2021-11-11T17:00:00.000Z,2021-11-11T17:00:00.000Z,D8:F3:BC:3D:15:EF,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,Lake Forest Drive,,,92637
33.62973404,-117.71619415,Flock-8964CF,0,20220625-00000,2022-06-25T18:00:00.000Z,2022-06-25T18:00:00.000Z,2022-06-25T19:00:00.000Z,74:4C:A1:89:64:CF,,infra,,2,0,?,?,?,False,40,,wpa2,US,CA,Lake Forest Drive,,22873,92630
33.63542175,-117.96453857,Flock-BDC7FB,0,20210328-00000,2021-03-28T21:00:00.000Z,2021-03-28T21:00:00.000Z,2022-07-02T02:00:00.000Z,3C:91:80:BD:C7:FB,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Pacific Coast Highway,Huntington Beach,,92646
33.63858795,-117.34395599,Flock-67578D,0,20220420-00000,2022-04-11T20:00:00.000Z,2022-04-20T23:00:00.000Z,2022-04-21T00:00:00.000Z,94:08:53:67:57:8D,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Grand Avenue,,17687,92530
33.64059448,-83.98535156,Flock-8098AB,2,20210119-00000,2021-01-19T22:00:00.000Z,2022-11-16T19:00:00.000Z,2022-11-16T20:00:00.000Z,E4:AA:EA:80:98:AB,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Iris Drive Southeast,,2000,30013
33.64345169,-84.45527649,Flock-32F3CD,0,20210522-00000,2021-05-21T10:00:00.000Z,2021-05-22T22:00:00.000Z,2022-07-01T18:00:00.000Z,E4:AA:EA:32:F3:CD,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,Convention Center Concourse,,2081,30337
33.6509285,-86.68296051,Flock-BDBAA1,0,20210220-00000,2021-02-19T17:00:00.000Z,2021-02-20T00:00:00.000Z,2022-06-27T19:00:00.000Z,3C:91:80:BD:BA:A1,,infra,,2,0,?,?,?,False,11,,wpa2,US,AL,25th Avenue Northeast,,1,35215
33.65233994,-86.70053101,Flock-BDC18F,0,20210220-00000,2021-02-19T17:00:00.000Z,2021-02-20T00:00:00.000Z,2022-06-27T18:00:00.000Z,3C:91:80:BD:C1:8F,,infra,,2,0,?,?,?,False,6,,wpa2,US,AL,Sunhill Road Northwest,,573,35215
33.65319824,-86.6541748,Flock-BDB4CB,0,20201006-00000,2020-10-06T11:00:00.000Z,2020-10-06T15:00:00.000Z,2022-06-27T20:00:00.000Z,3C:91:80:BD:B4:CB,,infra,,2,0,?,?,?,False,6,,wpa2,US,AL,Sweeny Hollow Road,Clay,2382,35215
33.65803528,-117.17377472,Flock-4444DF,2,20210711-00000,2021-07-11T17:00:00.000Z,2021-08-03T18:00:00.000Z,2022-07-03T13:00:00.000Z,D8:F3:BC:44:44:DF,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Anders Lane,,,92584
33.65838242,-84.42744446,Flock-E055FF,0,20211116-00000,2021-11-16T14:00:00.000Z,2021-11-16T11:00:00.000Z,2021-11-16T11:00:00.000Z,80:30:49:E0:55:FF,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Virginia Avenue,,1180,30344
33.66067123,-84.49705505,Flock-21D14D,0,20210816-00000,2021-08-16T14:00:00.000Z,2021-08-16T14:00:00.000Z,2022-07-01T14:00:00.000Z,80:30:49:21:D1:4D,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,Redwine Road,,,30337
33.66180038,-86.66360474,Flock-BAE311,0,20201006-00000,2020-10-06T11:00:00.000Z,2020-10-06T15:00:00.000Z,2022-06-27T20:00:00.000Z,3C:91:80:BA:E3:11,,infra,,2,0,?,?,?,False,11,,wpa2,US,AL,Sweeny Hollow Road,Clay,2695,35215
33.66585541,-84.41770172,Flock-BA655B,0,20211120-00000,2021-11-18T20:00:00.000Z,2021-11-20T10:00:00.000Z,2021-11-20T10:00:00.000Z,B8:27:EB:BA:65:5B,,infra,,2,0,?,?,?,False,7,,wpa2,US,GA,I 85,,,30394
33.66787338,-84.03703308,Flock-3D0D33,0,20220123-00000,2022-01-23T14:00:00.000Z,2022-01-23T13:00:00.000Z,2022-01-23T13:00:00.000Z,D8:F3:BC:3D:0D:33,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,Dogwood Drive Southwest,,1510,30012
33.67064667,-96.61078644,Flock-7EAFBD,0,20211117-00000,2021-11-15T19:00:00.000Z,2021-11-17T11:00:00.000Z,2021-11-17T11:00:00.000Z,74:4C:A1:7E:AF:BD,,infra,,2,0,?,?,?,False,11,,wpa2,US,TX,East Buck Owens Freeway,,,75090
33.67434692,-118.02561188,Flock-3D2849,0,20210627-00000,2021-06-28T02:00:00.000Z,2021-06-27T19:00:00.000Z,2022-07-02T00:00:00.000Z,D8:F3:BC:3D:28:49,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Pacific Coast Highway,Huntington Beach,,92648
33.67486572,-118.02600098,Flock-7EBAB1,0,20220220-00000,2022-02-20T20:00:00.000Z,2022-02-20T12:00:00.000Z,2022-02-20T12:00:00.000Z,74:4C:A1:7E:BA:B1,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Pacific Coast Highway,Huntington Beach,,92648
33.67552948,-118.02692413,Flock-7F6B81,0,20210621-00000,2020-09-07T14:00:00.000Z,2021-06-21T14:00:00.000Z,2022-07-01T23:00:00.000Z,70:C9:4E:7F:6B:81,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,Pacific Coast Highway,Huntington Beach,,92648
33.68048477,-117.17086029,Flock-E05689,2,20210803-00000,2021-08-03T10:00:00.000Z,2021-08-26T15:00:00.000Z,2021-08-26T15:00:00.000Z,80:30:49:E0:56:89,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Escondido Freeway,,,92584
33.68500519,-117.17550659,Flock-864C11,0,20220522-00000,2022-05-21T19:00:00.000Z,2022-05-22T11:00:00.000Z,2022-05-22T18:00:00.000Z,14:5A:FC:86:4C:11,,infra,,2,0,?,?,?,False,161,,wpa2,US,CA,Haun Road,,,92584
33.68515015,-117.15441132,Flock-7DD209,0,20210817-00000,2021-08-17T14:00:00.000Z,2021-08-17T15:00:00.000Z,2022-07-03T16:00:00.000Z,D8:F3:BC:7D:D2:09,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Newport Road,,,92584
33.70830536,-117.98920441,Flock-809D03,0,20200809-00000,2020-07-29T11:00:00.000Z,2020-08-09T14:00:00.000Z,2022-07-02T01:00:00.000Z,E4:AA:EA:80:9D:03,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Beach Boulevard,Huntington Beach,17501,92647
33.71532059,-118.03659058,Flock-BDAF21,0,20200920-00000,2020-09-20T13:00:00.000Z,2020-09-20T19:00:00.000Z,2022-07-01T23:00:00.000Z,3C:91:80:BD:AF:21,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Warner Avenue,Huntington Beach,,92647
33.71567154,-117.99171448,Flock-809E8B,0,20200821-00000,2020-08-21T14:00:00.000Z,2020-08-21T14:00:00.000Z,2022-07-02T01:00:00.000Z,E4:AA:EA:80:9E:8B,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Warner Avenue,Huntington Beach,,92655
33.71579742,-117.9941864,Flock-BDC4A7,0,20200819-00000,2020-08-11T15:00:00.000Z,2020-08-19T14:00:00.000Z,2022-07-02T01:00:00.000Z,3C:91:80:BD:C4:A7,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Warner Avenue,Huntington Beach,7661,92647
33.72904205,-117.98918915,Flock-864855,0,20220715-00000,2022-07-15T12:00:00.000Z,2022-07-15T12:00:00.000Z,2022-07-15T12:00:00.000Z,14:5A:FC:86:48:55,,infra,,2,0,?,?,?,False,36,,wpa2,US,CA,Beach Boulevard,Huntington Beach,16122,92647
33.7294693,-84.36430359,Flock-127B5B,1,20201111-00000,2020-09-06T16:00:00.000Z,2020-11-11T18:00:00.000Z,2022-07-02T05:00:00.000Z,80:30:49:12:7B:5B,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Charles Bank Avenue,Atlanta,,30316
33.72954941,-84.36406708,Flock-809ED9,5,20201111-00000,2020-09-05T19:00:00.000Z,2021-06-15T08:00:00.000Z,2022-07-02T05:00:00.000Z,E4:AA:EA:80:9E:D9,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Charles Bank Avenue,Atlanta,,30316
33.72982788,-117.98913574,Flock-BFE1E3,0,20200809-00000,2020-07-29T11:00:00.000Z,2020-08-09T14:00:00.000Z,2022-07-02T01:00:00.000Z,3C:91:80:BF:E1:E3,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Beach Boulevard,Huntington Beach,16339,92683
33.73018646,-117.98931122,Flock-BDC611,1,20200719-00000,2020-07-15T17:00:00.000Z,2020-08-09T14:00:00.000Z,2022-07-02T01:00:00.000Z,3C:91:80:BD:C6:11,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Edinger Avenue,Huntington Beach,,92655
33.7302742,-117.98878479,Flock-7EC025,0,20220205-00000,2022-02-05T19:00:00.000Z,2022-02-05T12:00:00.000Z,2022-02-05T12:00:00.000Z,74:4C:A1:7E:C0:25,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,Edinger Avenue,,,92655
33.74709702,-84.29122925,Flock-7DCA59,0,20210720-00000,2021-07-20T10:00:00.000Z,2021-07-20T08:00:00.000Z,2022-07-02T14:00:00.000Z,D8:F3:BC:7D:CA:59,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Memorial Drive Southeast,Atlanta,,30317
33.74812317,-118.04147339,Flock-7EC725,0,20211220-00000,2021-12-01T18:00:00.000Z,2021-12-20T08:00:00.000Z,2021-12-20T08:00:00.000Z,74:4C:A1:7E:C7:25,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Skylab Road,Huntington Beach,5050,92647
33.7619133,-84.1973877,Flock-3D2699,0,20211116-00000,2021-11-16T15:00:00.000Z,2021-11-16T12:00:00.000Z,2021-11-16T12:00:00.000Z,D8:F3:BC:3D:26:99,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,Redan Road,,4767,30083
33.77249146,-84.3901062,Flock-E056D1,2,20210406-00000,2021-04-01T17:00:00.000Z,2021-06-05T12:00:00.000Z,2022-07-02T00:00:00.000Z,80:30:49:E0:56:D1,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Downtown Connector,Atlanta,,30308-3217
33.77249908,-84.39008331,Flock-80A18B,4,20201111-00000,2020-07-20T18:00:00.000Z,2020-11-30T12:00:00.000Z,2022-07-02T00:00:00.000Z,E4:AA:EA:80:A1:8B,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Downtown Connector,Atlanta,,30308-3217
33.77327728,-116.97179413,Flock-E0581D,0,20211023-00000,2021-10-12T21:00:00.000Z,2021-10-23T10:00:00.000Z,2021-10-23T10:00:00.000Z,80:30:49:E0:58:1D,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,State Street,,1392,92583
33.77370453,-84.551651,Flock-68DEB7,2,20210805-00000,2021-08-05T16:00:00.000Z,2021-08-15T12:00:00.000Z,2022-07-01T08:00:00.000Z,74:4C:A1:68:DE:B7,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Six Flags Parkway,,,30336
33.77416611,-118.09694672,Flock-723BE3,0,20190515-00000,2019-05-15T13:00:00.000Z,2019-05-15T14:00:00.000Z,2022-07-01T20:00:00.000Z,B8:27:EB:72:3B:E3,,infra,,2,0,?,?,?,False,7,,wpa2,US,CA,CA 22,,,90840
33.77618027,-84.5638504,Flock-675A71,0,20220522-00000,2022-05-22T17:00:00.000Z,2022-05-22T15:00:00.000Z,2022-05-22T21:00:00.000Z,94:08:53:67:5A:71,,infra,,2,0,?,?,?,False,36,,wpa2,US,GA,Riverside Parkway,,562,30168
33.77664566,-117.99271393,Flock-896301,0,20220130-00000,2022-01-30T09:00:00.000Z,2022-01-30T10:00:00.000Z,2022-01-30T10:00:00.000Z,74:4C:A1:89:63:01,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Beach Boulevard,Stanton,,92683-3804
33.77922058,-84.53733826,Flock-E0563B,0,20210805-00000,2021-08-05T16:00:00.000Z,2021-08-05T16:00:00.000Z,2022-07-01T09:00:00.000Z,80:30:49:E0:56:3B,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Lee Industrial Boulevard Southwest,,668,30168
33.78025055,-84.33634949,Flock-809F1F,0,20201007-00000,2020-10-07T14:00:00.000Z,2020-10-07T15:00:00.000Z,2022-07-02T09:00:00.000Z,E4:AA:EA:80:9F:1F,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,Oakdale Road Northeast,Atlanta,,30307
33.78103256,-117.99295807,Flock-3D1313,0,20210919-00000,2021-09-19T21:00:00.000Z,2021-09-19T14:00:00.000Z,2021-09-19T14:00:00.000Z,D8:F3:BC:3D:13:13,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Beach Boulevard,Stanton,,92841
33.78220749,-84.96655273,Flock-3D11FF,0,20210606-00000,2021-06-06T18:00:00.000Z,2021-06-06T20:00:00.000Z,2022-06-30T18:00:00.000Z,D8:F3:BC:3D:11:FF,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Rockmart Road,,2663,30180
33.78490448,-116.93653107,Flock-7DCB6B,0,20220224-00000,2022-02-24T20:00:00.000Z,2022-02-24T21:00:00.000Z,2022-02-24T21:00:00.000Z,D8:F3:BC:7D:CB:6B,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Lake Park Drive,,,92581
33.7852478,-84.41174316,Flock-BDC095,0,20210117-00000,2021-01-17T14:00:00.000Z,2021-01-17T17:00:00.000Z,2022-07-01T22:00:00.000Z,3C:91:80:BD:C0:95,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,Howell Mill Road Northwest,Atlanta,,30332-0440
33.7864418,-84.41226196,Flock-0B7C52,0,20190802-00000,2019-08-02T20:00:00.000Z,2019-08-02T20:00:00.000Z,2022-07-01T22:00:00.000Z,B8:27:EB:0B:7C:52,,infra,,2,0,?,?,?,False,7,,wpa2,US,GA,Howell Mill Road Northwest,Atlanta,,30332-0440
33.78646469,-84.41230011,Flock-93C3C5,0,20190802-00000,2019-08-02T20:00:00.000Z,2019-08-02T20:00:00.000Z,2022-07-01T22:00:00.000Z,B8:27:EB:93:C3:C5,,infra,,2,0,?,?,?,False,7,,wpa2,US,GA,Howell Mill Road Northwest,Atlanta,,30332-0440
33.78646851,-84.41259003,Flock-7B76E7,0,20190802-00000,2019-08-02T19:00:00.000Z,2019-08-02T20:00:00.000Z,2022-07-01T22:00:00.000Z,B8:27:EB:7B:76:E7,,infra,,2,0,?,?,?,False,7,,wpa2,US,GA,Howell Mill Road Northwest,Atlanta,,30332-0440
33.78647995,-84.4124527,Flock-BC6697,0,20190802-00000,2019-08-02T20:00:00.000Z,2019-08-02T20:00:00.000Z,2022-07-01T22:00:00.000Z,B8:27:EB:BC:66:97,,infra,,2,0,?,?,?,False,7,,wpa2,US,GA,Howell Mill Road Northwest,Atlanta,,30332-0440
33.78678131,-84.23262024,Flock-281A01,1,20210525-00000,2021-05-25T12:00:00.000Z,2021-07-16T12:00:00.000Z,2022-07-02T19:00:00.000Z,94:08:53:28:1A:01,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Rockbridge Road,,,30058
33.79170227,-84.37447357,Flock-21CDD9,1,20210513-00000,2021-05-12T18:00:00.000Z,2021-05-15T16:00:00.000Z,2022-07-02T03:00:00.000Z,80:30:49:21:CD:D9,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Park Lane Northeast,Atlanta,,30309
33.79491425,-84.30561829,Flock-7DC9F7,2,20210616-00000,2021-06-16T22:00:00.000Z,2021-11-27T18:00:00.000Z,2021-11-27T18:00:00.000Z,D8:F3:BC:7D:C9:F7,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Clairmont Road,,1430,30033
33.80290985,-118.00740814,Flock-3D1F67,0,20211108-00000,2021-11-08T08:00:00.000Z,2021-11-08T11:00:00.000Z,2021-11-08T11:00:00.000Z,D8:F3:BC:3D:1F:67,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,West Katella Avenue,Stanton,,90680
33.80298996,-117.97727203,Flock-BFE327,0,20200619-00000,2020-06-15T14:00:00.000Z,2020-06-19T13:00:00.000Z,2022-07-02T02:00:00.000Z,3C:91:80:BF:E3:27,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Katella Avenue,Stanton,8892,92841
33.80321884,-118.07740784,Flock-896259,0,20220516-00000,2022-05-16T10:00:00.000Z,2022-05-16T11:00:00.000Z,2022-05-16T11:00:00.000Z,74:4C:A1:89:62:59,,infra,,2,0,?,?,?,False,157,,wpa2,US,CA,West Katella Avenue,,,90720
33.80399323,-84.84647369,Flock-BDBDBB,0,20201225-00000,2020-12-25T09:00:00.000Z,2020-12-25T07:00:00.000Z,2022-06-30T21:00:00.000Z,3C:91:80:BD:BD:BB,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Ridge Road,,2841,30134
33.80658722,-84.37521362,Flock-21CEB7,0,20210709-00000,2021-07-09T18:00:00.000Z,2021-07-09T15:00:00.000Z,2022-07-02T03:00:00.000Z,80:30:49:21:CE:B7,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,Monroe Drive Northeast,Atlanta,1899,30324
33.80807495,-84.50737762,Flock-32F45B,0,20210805-00000,2021-08-05T16:00:00.000Z,2021-08-05T16:00:00.000Z,2022-07-01T12:00:00.000Z,E4:AA:EA:32:F4:5B,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Oakdale Road Southeast,Smyrna,6001,30126
33.80844498,-84.50712585,Flock-3D1E17,0,20210815-00000,2021-08-15T15:00:00.000Z,2021-08-15T12:00:00.000Z,2022-07-01T12:00:00.000Z,D8:F3:BC:3D:1E:17,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Abatis Way Southeast,Smyrna,3600,30126
33.80872345,-84.43184662,Flock-7EB3BF,0,20211123-00000,2021-11-21T13:00:00.000Z,2021-11-23T19:00:00.000Z,2021-11-23T19:00:00.000Z,74:4C:A1:7E:B3:BF,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Seaboard Industrial Boulevard Northwest,Atlanta,1340,30318
33.81427002,-117.99337006,Flock-4444D5,0,20211110-00000,2021-11-10T08:00:00.000Z,2021-11-10T14:00:00.000Z,2021-11-10T14:00:00.000Z,D8:F3:BC:44:44:D5,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,Beach Boulevard,Stanton,10191,90680
33.81552505,-84.33517456,Flock-3D1A85,0,20211210-00000,2021-12-06T14:00:00.000Z,2021-12-10T16:00:00.000Z,2021-12-10T16:00:00.000Z,D8:F3:BC:3D:1A:85,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Lavista Road Northeast,Atlanta,,30324
33.82342529,-117.03365326,Flock-969F67,0,20220601-00000,2022-06-01T16:00:00.000Z,2022-06-01T20:00:00.000Z,2022-06-01T21:00:00.000Z,14:5A:FC:96:9F:67,,infra,,2,0,?,?,?,False,165,,wpa2,US,CA,Ramona Expressway,,36501,92582
33.8235321,-84.11174774,Flock-5A5323,0,20220814-00000,2022-07-06T09:00:00.000Z,2022-08-14T00:00:00.000Z,2022-08-14T01:00:00.000Z,9C:2F:9D:5A:53:23,,infra,,2,0,?,?,?,False,44,,wpa2,US,GA,Stone Mountain Highway,,5245,30087
33.82528687,-84.38748932,Flock-7EBEB9,0,20211112-00000,2021-11-12T23:00:00.000Z,2021-11-12T20:00:00.000Z,2021-11-12T20:00:00.000Z,74:4C:A1:7E:BE:B9,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Peachtree Road,Atlanta,2575,30305
33.83175278,-117.53765106,Flock-127BE7,0,20220326-00000,2022-03-26T13:00:00.000Z,2022-03-26T14:00:00.000Z,2022-03-26T15:00:00.000Z,80:30:49:12:7B:E7,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,East Foothill Parkway,Corona,1620,92881
33.83432388,-84.42420197,Flock-67ED9D,0,20200830-00000,2020-08-29T20:00:00.000Z,2020-08-30T15:00:00.000Z,2022-07-01T21:00:00.000Z,B8:27:EB:67:ED:9D,,infra,,2,0,?,?,?,False,7,,wpa2,US,GA,Moores Mill Road,Atlanta,1120,30327
33.83496857,-84.46859741,Flock-7EBF3F,0,20220216-00000,2022-02-16T18:00:00.000Z,2022-02-16T16:00:00.000Z,2022-02-16T16:00:00.000Z,74:4C:A1:7E:BF:3F,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,South Atlanta Road,,4833,30339
33.83511353,-84.20343781,Flock-127943,0,20210906-00000,2021-09-04T14:00:00.000Z,2021-09-06T11:00:00.000Z,2021-09-06T11:00:00.000Z,80:30:49:12:79:43,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Stone Mountain Freeway,,,30083-1009
33.83579636,-117.99408722,Flock-7ECC69,0,20211029-00000,2021-10-29T08:00:00.000Z,2021-10-29T15:00:00.000Z,2021-10-29T15:00:00.000Z,74:4C:A1:7E:CC:69,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,Beach Boulevard,,,90620-3207
33.83703613,-84.36817932,Flock-BDB559,0,20201111-00000,2020-09-22T19:00:00.000Z,2020-11-11T18:00:00.000Z,2022-07-02T04:00:00.000Z,3C:91:80:BD:B5:59,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Piedmont Road Northeast,Atlanta,3016,30305
33.83751678,-117.99397278,Flock-7EAFD9,0,20211108-00000,2021-11-08T08:00:00.000Z,2021-11-08T11:00:00.000Z,2021-11-08T11:00:00.000Z,74:4C:A1:7E:AF:D9,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Beach Boulevard,,8650,90620
33.84028625,-84.51847076,Flock-21D35B,0,20210208-00000,2021-02-08T16:00:00.000Z,2021-02-08T13:00:00.000Z,2022-07-01T11:00:00.000Z,80:30:49:21:D3:5B,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,Highlands Ridge Road Southeast,Smyrna,1395,30082
33.84495544,-116.46669769,Flock-3D217F,0,20231014-00000,2021-04-30T05:00:00.000Z,2023-10-14T10:00:00.000Z,2023-10-14T11:00:00.000Z,D8:F3:BC:3D:21:7F,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,Vista Chino,,,92264-3613
33.84854507,-78.65377045,Flock-5E4939,0,20240315-00000,2024-03-15T14:00:00.000Z,2024-03-15T10:00:00.000Z,2024-03-15T10:00:00.000Z,F4:6A:DD:5E:49:39,,infra,,2,0,?,?,?,False,40,0,wpa2,US,SC,Sea Mountain Highway,,,29566
33.85048676,-84.60643005,Flock-8099AB,0,20210208-00000,2021-02-08T16:00:00.000Z,2021-02-08T13:00:00.000Z,2022-07-01T03:00:00.000Z,E4:AA:EA:80:99:AB,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Austell Road,,,30106
33.85177994,-118.03744507,Flock-3D1409,0,20210915-00000,2021-09-15T10:00:00.000Z,2021-09-15T12:00:00.000Z,2021-09-15T12:00:00.000Z,D8:F3:BC:3D:14:09,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,Marview Drive,,5481,90623
33.85263443,-117.99806213,Flock-7EC3E5,0,20211017-00000,2021-10-17T09:00:00.000Z,2021-10-17T13:00:00.000Z,2021-10-17T13:00:00.000Z,74:4C:A1:7E:C3:E5,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Beach Boulevard,,,90620-3207
33.85469437,-84.35405731,Flock-7ECBB3,0,20211115-00000,2021-11-15T19:00:00.000Z,2021-11-15T16:00:00.000Z,2021-11-15T16:00:00.000Z,74:4C:A1:7E:CB:B3,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Peachtree Road,Atlanta,,30319–3380
33.85486603,-84.35369873,Flock-80A369,0,20210410-00000,2021-04-10T22:00:00.000Z,2021-04-10T19:00:00.000Z,2022-07-02T07:00:00.000Z,E4:AA:EA:80:A3:69,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Peachtree Road,Atlanta,,30319–3380
33.85512161,-84.02845001,Flock-3D1419,0,20220115-00000,2022-01-15T12:00:00.000Z,2022-01-15T09:00:00.000Z,2022-01-15T09:00:00.000Z,D8:F3:BC:3D:14:19,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,Main Street,,,33078
33.85749817,-84.34515381,Flock-7EB19D,0,20211115-00000,2021-11-15T19:00:00.000Z,2021-11-15T16:00:00.000Z,2021-11-15T16:00:00.000Z,74:4C:A1:7E:B1:9D,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,Peachtree Road Northeast,,3851,30319
33.85762787,-84.34535217,Flock-127BA3,0,20210410-00000,2021-04-10T22:00:00.000Z,2021-04-10T19:00:00.000Z,2022-07-02T08:00:00.000Z,80:30:49:12:7B:A3,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Peachtree Road Northeast,,,30319
33.85817337,-84.31191254,Flock-7885FF,0,20220528-00000,2022-05-14T16:00:00.000Z,2022-05-28T10:00:00.000Z,2022-05-28T10:00:00.000Z,14:5A:FC:78:85:FF,,infra,,2,0,?,?,?,False,157,,wpa2,US,GA,Clairmont Road Northeast,,,30319
33.85842514,-117.94171906,Flock-281B65,0,20211003-00000,2021-09-22T10:00:00.000Z,2021-10-03T03:00:00.000Z,2021-10-03T03:00:00.000Z,94:08:53:28:1B:65,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,South Euclid Street,Fullerton,1344,92832
33.85954285,-117.92428589,Flock-7EC0E9,0,20211021-00000,2021-10-21T11:00:00.000Z,2021-10-21T11:00:00.000Z,2021-10-21T11:00:00.000Z,74:4C:A1:7E:C0:E9,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Harbor Boulevard,Fullerton,,92832
33.86234665,-84.29137421,Flock-BDCA93,3,20210607-00000,2021-06-07T13:00:00.000Z,2021-08-06T03:00:00.000Z,2022-07-02T14:00:00.000Z,3C:91:80:BD:CA:93,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,I-85 HOV,,,30345-1646
33.86395645,-84.28972626,Flock-7DC2FD,0,20210704-00000,2021-07-04T16:00:00.000Z,2021-07-04T15:00:00.000Z,2022-07-02T14:00:00.000Z,D8:F3:BC:7D:C2:FD,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,Northeast Expressway,,,30345-1646
33.86545563,-84.47415924,Flock-7DC795,0,20211025-00000,2021-10-25T18:00:00.000Z,2021-10-25T15:00:00.000Z,2021-10-25T15:00:00.000Z,D8:F3:BC:7D:C7:95,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Paces Ferry Road Southeast,,,30339
33.87044907,-84.45769501,Flock-21D239,0,20200925-00000,2020-09-25T21:00:00.000Z,2020-09-25T19:00:00.000Z,2022-07-01T18:00:00.000Z,80:30:49:21:D2:39,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Paces Mill Road Southeast,,3295,30339
33.87431335,-84.35788727,Flock-281A19,0,20210701-00000,2021-07-01T23:00:00.000Z,2021-07-01T20:00:00.000Z,2022-07-02T06:00:00.000Z,94:08:53:28:1A:19,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,Peachtree Dunwoody Road,Sandy Springs,4398,30342
33.88192368,-84.37423706,Flock-B2337D,0,20210202-00000,2021-02-02T12:00:00.000Z,2021-02-02T13:00:00.000Z,2022-07-02T03:00:00.000Z,3C:91:80:B2:33:7D,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Windsor Parkway Northeast,Sandy Springs,425,30342
33.88329315,-84.48300934,Flock-3D26B3,1,20210612-00000,2021-06-12T19:00:00.000Z,2021-08-19T15:00:00.000Z,2022-07-01T16:00:00.000Z,D8:F3:BC:3D:26:B3,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Spring Road Southeast,Smyrna,,30080-2700
33.88575745,-84.47164154,Flock-7DCD9B,3,20210629-00000,2021-06-29T20:00:00.000Z,2022-03-16T17:00:00.000Z,2022-03-16T17:00:00.000Z,D8:F3:BC:7D:CD:9B,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,Cobb Parkway South,Smyrna,,30339
33.88608932,-84.47190094,Flock-BDB53B,0,20201012-00000,2020-10-12T21:00:00.000Z,2020-10-12T18:00:00.000Z,2022-07-01T17:00:00.000Z,3C:91:80:BD:B5:3B,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Spring Road Southeast,Smyrna,,30339
33.89247131,-84.4681015,Flock-7F64E7,0,20210518-00000,2021-05-18T18:00:00.000Z,2021-05-18T15:00:00.000Z,2022-07-01T17:00:00.000Z,70:C9:4E:7F:64:E7,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Windy Ridge Parkway Southeast,,,30339
33.89332962,-84.46591187,Flock-5651A7,0,20210518-00000,2021-05-18T18:00:00.000Z,2021-05-18T15:00:00.000Z,2022-07-01T17:00:00.000Z,E4:AA:EA:56:51:A7,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Windy Ridge Parkway Southeast,,,30339
33.89512634,-84.30527496,Flock-7F6C47,0,20200709-00000,2020-06-30T21:00:00.000Z,2020-07-09T10:00:00.000Z,2022-07-02T12:00:00.000Z,70:C9:4E:7F:6C:47,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Peachtree Boulevard,,,30341
33.90093613,-84.44502258,Flock-892EB5,2,20220218-00000,2022-02-18T19:00:00.000Z,2022-06-14T15:00:00.000Z,2022-06-14T19:00:00.000Z,74:4C:A1:89:2E:B5,,infra,,2,0,?,?,?,False,36,,wpa2,US,GA,Perimeter,,,30339
33.90136337,-84.44298553,Flock-8988C9,0,20220228-00000,2022-02-28T20:00:00.000Z,2022-02-28T17:00:00.000Z,2022-02-28T18:00:00.000Z,74:4C:A1:89:88:C9,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Perimeter,Sandy Springs,,30339
33.90168762,-84.24298859,Flock-8C7CEF,1,20220523-00000,2022-05-23T07:00:00.000Z,2022-06-02T04:00:00.000Z,2022-06-02T04:00:00.000Z,74:4C:A1:8C:7C:EF,,infra,,2,0,?,?,?,False,165,,wpa2,US,GA,Northeast Expressway,,,30340
33.90240097,-84.44130707,Flock-3D1473,0,20210816-00000,2021-08-16T15:00:00.000Z,2021-08-16T12:00:00.000Z,2022-07-01T20:00:00.000Z,D8:F3:BC:3D:14:73,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Perimeter,Sandy Springs,,30339
33.90248108,-84.80175018,Flock-564BA7,0,20210217-00000,2021-02-17T10:00:00.000Z,2021-02-17T08:00:00.000Z,2022-06-30T21:00:00.000Z,E4:AA:EA:56:4B:A7,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Butler Industrial Drive,,481,30132
33.90891647,-84.29130554,Flock-564DD1,2,20200709-00000,2020-06-30T21:00:00.000Z,2020-11-11T18:00:00.000Z,2022-07-02T14:00:00.000Z,E4:AA:EA:56:4D:D1,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Peachtree Boulevard,,,30360
33.91264725,-84.38733673,Flock-564E05,0,20220225-00000,2022-02-25T19:00:00.000Z,2022-02-25T16:00:00.000Z,2022-02-25T16:00:00.000Z,E4:AA:EA:56:4E:05,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Perimeter,Sandy Springs,,30328
33.9127121,-84.38733673,Flock-BFE1DF,0,20210126-00000,2021-01-26T19:00:00.000Z,2021-01-26T18:00:00.000Z,2022-07-02T01:00:00.000Z,3C:91:80:BF:E1:DF,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,Perimeter,Sandy Springs,,30328
33.91769791,-84.29190063,Flock-3D277B,0,20220213-00000,2022-02-12T21:00:00.000Z,2022-02-13T12:00:00.000Z,2022-02-13T12:00:00.000Z,D8:F3:BC:3D:27:7B,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Perimeter,,,30360
33.91791916,-84.33830261,Flock-895843,0,20220519-00000,2022-05-19T07:00:00.000Z,2022-05-19T05:00:00.000Z,2022-05-19T05:00:00.000Z,74:4C:A1:89:58:43,,infra,,2,0,?,?,?,False,153,,wpa2,US,GA,Perimeter,,,30346
33.91795349,-84.33829498,Flock-8655E7,0,20220413-00000,2022-04-13T07:00:00.000Z,2022-04-13T05:00:00.000Z,2022-04-13T05:00:00.000Z,14:5A:FC:86:55:E7,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Ashford Dunwoody Road Northeast,,,30346
33.9201355,-84.29667664,Flock-7EC3CF,0,20211206-00000,2021-12-06T13:00:00.000Z,2021-12-06T19:00:00.000Z,2021-12-06T19:00:00.000Z,74:4C:A1:7E:C3:CF,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,Perimeter,,,30360
33.92048645,-84.36574554,Flock-809A87,0,20200826-00000,2020-08-26T20:00:00.000Z,2020-08-26T17:00:00.000Z,2022-07-02T05:00:00.000Z,E4:AA:EA:80:9A:87,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Glenridge Drive Northeast,Sandy Springs,6045,30328
33.92050171,-84.31544495,Flock-895DDD,0,20220209-00000,2022-02-09T22:00:00.000Z,2022-02-09T19:00:00.000Z,2022-02-09T19:00:00.000Z,74:4C:A1:89:5D:DD,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Perimeter,,,31146
33.92288971,-84.49259186,Flock-BFED0D,0,20210416-00000,2021-04-16T18:00:00.000Z,2021-04-16T15:00:00.000Z,2022-07-01T15:00:00.000Z,3C:91:80:BF:ED:0D,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Delk Road Southeast,Marietta,,30067
33.9229393,-117.86395264,Flock-892C4D,0,20220101-00000,2021-12-31T17:00:00.000Z,2022-01-01T11:00:00.000Z,2022-01-01T11:00:00.000Z,74:4C:A1:89:2C:4D,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,North Kraemer Boulevard,,,92821
33.92305756,-84.33812714,Flock-7ECECB,0,20220206-00000,2022-02-06T07:00:00.000Z,2022-02-06T04:00:00.000Z,2022-02-06T04:00:00.000Z,74:4C:A1:7E:CE:CB,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,Ashford Dunwoody Road Northeast,,,30338
33.9243927,-84.37741852,Flock-E0571F,0,20211025-00000,2021-10-25T15:00:00.000Z,2021-10-25T15:00:00.000Z,2021-10-25T15:00:00.000Z,80:30:49:E0:57:1F,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Mount Vernon Highway,Sandy Springs,,30338
33.92453384,-84.36737061,Flock-7EC5C3,0,20211025-00000,2021-10-25T16:00:00.000Z,2021-10-25T15:00:00.000Z,2021-10-25T15:00:00.000Z,74:4C:A1:7E:C5:C3,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Glenridge Drive Northeast,Sandy Springs,6207,30328
33.92728806,-84.37914276,Flock-7F6827,0,20200605-00000,2020-06-05T23:00:00.000Z,2020-06-05T22:00:00.000Z,2022-07-02T02:00:00.000Z,70:C9:4E:7F:68:27,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,Roswell Road,Sandy Springs,,30328
33.93155289,-84.33748627,Flock-3D1A09,0,20211025-00000,2021-10-25T16:00:00.000Z,2021-10-25T15:00:00.000Z,2021-10-25T15:00:00.000Z,D8:F3:BC:3D:1A:09,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Meadow Lane Road,,,30338
33.93265533,-84.36598206,Flock-1279C1,0,20210406-00000,2021-04-01T18:00:00.000Z,2021-04-06T10:00:00.000Z,2022-07-02T05:00:00.000Z,80:30:49:12:79:C1,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,Glenridge Drive Northeast,Sandy Springs,6562,30328
33.9344101,-86.19166565,Flock-7EBBF5,1,20211026-00000,2021-10-26T22:00:00.000Z,2022-03-30T06:00:00.000Z,2022-03-30T06:00:00.000Z,74:4C:A1:7E:BB:F5,,infra,,2,0,?,?,?,False,1,,wpa2,US,AL,I 59,,,35987
33.9344902,-86.19291687,Flock-969D83,0,20220710-00000,2022-07-10T16:00:00.000Z,2022-07-10T16:00:00.000Z,2022-07-10T16:00:00.000Z,14:5A:FC:96:9D:83,,infra,,2,0,?,?,?,False,44,,wpa2,US,AL,I 59,,,35987
33.93477249,-84.38993835,Flock-80A3BF,0,20201105-00000,2020-11-05T20:00:00.000Z,2020-11-05T17:00:00.000Z,2022-07-02T00:00:00.000Z,E4:AA:EA:80:A3:BF,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Johnson Ferry Road Northwest,Sandy Springs,220,30328
33.9368248,-84.37858582,Flock-DA7E7D,0,20210124-00000,2021-01-03T15:00:00.000Z,2021-01-24T18:00:00.000Z,2022-07-02T02:00:00.000Z,B8:27:EB:DA:7E:7D,,infra,,2,0,?,?,?,False,7,,wpa2,US,GA,Roswell Road,Sandy Springs,,30328
33.93741226,-117.5586319,Flock-7EB399,1,20211218-00000,2021-12-18T17:00:00.000Z,2022-05-23T15:00:00.000Z,2022-05-23T15:00:00.000Z,74:4C:A1:7E:B3:99,,infra,,2,0,?,?,?,False,36,,wpa2,US,CA,Norco Drive,,1865,92860
33.93755722,-84.51353455,Flock-BAE585,0,20201006-00000,2020-10-06T22:00:00.000Z,2020-10-07T09:00:00.000Z,2022-07-01T11:00:00.000Z,3C:91:80:BA:E5:85,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Polytechnic Lane,Marietta,,30069
33.93838501,-117.5542984,Flock-3D0C85,0,20210908-00000,2021-09-08T13:00:00.000Z,2021-09-08T13:00:00.000Z,2021-09-08T13:00:00.000Z,D8:F3:BC:3D:0C:85,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,6th Street,,,92860
33.94232941,-84.40462494,Flock-7F66F9,0,20200629-00000,2020-06-29T09:00:00.000Z,2020-06-29T11:00:00.000Z,2022-07-01T23:00:00.000Z,70:C9:4E:7F:66:F9,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Riverside Drive Northwest,Sandy Springs,6850,30328
33.94258499,-84.5161972,Flock-7ECE33,0,20211019-00000,2021-10-19T11:00:00.000Z,2021-10-19T08:00:00.000Z,2021-10-19T08:00:00.000Z,74:4C:A1:7E:CE:33,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Cobb Parkway South,Marietta,,30069
33.94271851,-84.40442657,Flock-3D26C7,0,20210411-00000,2021-04-11T16:00:00.000Z,2021-04-11T14:00:00.000Z,2022-07-01T23:00:00.000Z,D8:F3:BC:3D:26:C7,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Riverside Drive Northwest,Sandy Springs,6886,30328
33.94348526,-84.40458679,Flock-7F610F,0,20200728-00000,2020-07-28T19:00:00.000Z,2020-07-28T20:00:00.000Z,2022-07-01T23:00:00.000Z,70:C9:4E:7F:61:0F,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,Johnson Ferry Road Southeast,Sandy Springs,,30328
33.9435463,-84.24002838,Flock-BDBC63,0,20210321-00000,2001-08-05T13:00:00.000Z,2021-03-21T11:00:00.000Z,2022-07-02T19:00:00.000Z,3C:91:80:BD:BC:63,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,Jimmy Carter Boulevard,,,30092
33.9441452,-84.40539551,Flock-3D201F,0,20211223-00000,2021-12-23T21:00:00.000Z,2021-12-23T20:00:00.000Z,2021-12-23T20:00:00.000Z,D8:F3:BC:3D:20:1F,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Johnson Ferry Road Southeast,Sandy Springs,,30328
33.94581223,-84.42193604,Flock-809B01,0,20210405-00000,2021-03-28T01:00:00.000Z,2021-04-05T15:00:00.000Z,2022-07-01T21:00:00.000Z,E4:AA:EA:80:9B:01,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Winged Foot Circle Southeast,,4411,30067
33.95229721,-84.13018799,Flock-864EFB,0,20220628-00000,2022-06-28T07:00:00.000Z,2022-06-28T15:00:00.000Z,2022-06-28T19:00:00.000Z,14:5A:FC:86:4E:FB,,infra,,2,0,?,?,?,False,40,,wpa2,US,GA,I 85,,,30096-4590
33.95468521,-84.35709381,Flock-895B3D,0,20220316-00000,2022-03-16T20:00:00.000Z,2022-03-16T17:00:00.000Z,2022-03-16T17:00:00.000Z,74:4C:A1:89:5B:3D,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Georgia 400,Sandy Springs,,30328:30350
33.95717239,-84.13656616,Flock-6FD54D,0,20220525-00000,2022-05-02T20:00:00.000Z,2022-05-25T17:00:00.000Z,2022-05-26T02:00:00.000Z,14:5A:FC:6F:D5:4D,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Satellite Boulevard,,3646,30096-4590
33.95806885,-84.66147614,Flock-564B7D,0,20210219-00000,2021-02-19T14:00:00.000Z,2021-02-19T11:00:00.000Z,2022-07-01T00:00:00.000Z,E4:AA:EA:56:4B:7D,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Old Hamilton Road,,146,30064
33.9589386,-117.91906738,Flock-6236C1,0,20200527-00000,2020-05-28T02:00:00.000Z,2020-05-27T22:00:00.000Z,2022-07-02T04:00:00.000Z,00:F4:8D:62:36:C1,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,North Harbor Boulevard,El Monte,,9221
33.96221542,-84.14161682,Flock-3D2539,0,20210724-00000,2021-07-24T10:00:00.000Z,2021-07-24T08:00:00.000Z,2022-07-03T00:00:00.000Z,D8:F3:BC:3D:25:39,,infra,,2,0,?,?,?,False,11,,wpa2,US,GA,Steve Reynolds Boulevard,,,30096-4590
33.96871567,-84.09706879,Flock-C0AC11,0,20220715-00000,2022-07-12T16:00:00.000Z,2022-07-15T16:00:00.000Z,2022-07-15T17:00:00.000Z,E0:0A:F6:C0:AC:11,,infra,,2,0,?,?,?,False,40,,wpa2,US,GA,Boggs Road,,,30096
33.98336792,-84.63484955,Flock-892977,0,20220204-00000,2022-02-04T14:00:00.000Z,2022-02-04T11:00:00.000Z,2022-02-04T11:00:00.000Z,74:4C:A1:89:29:77,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Kennesaw Due West Road Northwest,,1181,30152
33.98340225,-84.34092712,Flock-6D0E27,0,20190611-00000,2019-06-02T12:00:00.000Z,2019-06-11T15:00:00.000Z,2022-07-02T08:00:00.000Z,B8:27:EB:6D:0E:27,,infra,,2,0,?,?,?,False,7,,wpa2,US,GA,Georgia 400,Sandy Springs,,30350
34.0022583,-84.19594574,Flock-BAEE2B,4,20200615-00000,2020-06-14T13:00:00.000Z,2021-11-08T17:00:00.000Z,2021-11-08T17:00:00.000Z,3C:91:80:BA:EE:2B,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Prestwick Club Drive,Johns Creek,,30092-2021
34.00229263,-84.19597626,Flock-7F6AB5,0,20200709-00000,2020-07-08T13:00:00.000Z,2020-07-09T10:00:00.000Z,2022-07-02T21:00:00.000Z,70:C9:4E:7F:6A:B5,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Prestwick Club Drive,Johns Creek,,30092-2021
34.00321579,-84.19523621,Flock-89865D,0,20220624-00000,2022-06-24T20:00:00.000Z,2022-06-24T17:00:00.000Z,2022-06-24T20:00:00.000Z,74:4C:A1:89:86:5D,,infra,,2,0,?,?,?,False,36,,wpa2,US,GA,Medlock Bridge Road,Johns Creek,,30097
34.01665878,-84.55401611,Flock-564EAF,0,20200928-00000,2020-09-27T22:00:00.000Z,2020-09-28T00:00:00.000Z,2022-07-01T08:00:00.000Z,E4:AA:EA:56:4E:AF,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Chastain Meadows Parkway Northwest,,2520,30066
34.02980423,-117.9542923,Flock-893019,0,20211209-00000,2021-12-09T13:00:00.000Z,2021-12-09T15:00:00.000Z,2021-12-09T15:00:00.000Z,74:4C:A1:89:30:19,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,North Hacienda Boulevard,,551,91744
34.03339767,-118.12999725,Flock-892E13,0,20220528-00000,2022-05-28T15:00:00.000Z,2022-05-28T19:00:00.000Z,2022-05-28T19:00:00.000Z,74:4C:A1:89:2E:13,,infra,,2,0,?,?,?,False,36,,wpa2,US,CA,Garfield Avenue,,940,90640
34.0356369,-117.92655945,Flock-7DCE63,0,20211209-00000,2021-12-09T17:00:00.000Z,2021-12-09T17:00:00.000Z,2021-12-09T17:00:00.000Z,D8:F3:BC:7D:CE:63,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,East Amar Road,El Monte,,91744
34.03953171,-117.15395355,Flock-7F5D1D,0,20210506-00000,2021-05-06T00:00:00.000Z,2021-05-06T00:00:00.000Z,2022-07-03T16:00:00.000Z,70:C9:4E:7F:5D:1D,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,I 10,,1461,92373
34.03982544,-117.84270477,Flock-7F6783,0,20210527-00000,2021-04-26T13:00:00.000Z,2021-05-27T15:00:00.000Z,2022-07-02T09:00:00.000Z,70:C9:4E:7F:67:83,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,North Grand Avenue,,926,91789
34.04085541,-117.96849823,Flock-96A11F,0,20220623-00000,2022-06-23T04:00:00.000Z,2022-06-23T05:00:00.000Z,2022-06-23T05:00:00.000Z,14:5A:FC:96:A1:1F,,infra,,2,0,?,?,?,False,157,,wpa2,US,CA,Temple Avenue,,,91744
34.04172134,-117.15542603,Flock-127CBD,1,20210517-00000,2021-05-17T14:00:00.000Z,2021-11-08T19:00:00.000Z,2021-11-08T20:00:00.000Z,80:30:49:12:7C:BD,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,I 10,,,92374
34.04202271,-118.08191681,Flock-479E23,0,20210723-00000,2021-07-23T14:00:00.000Z,2021-07-23T18:00:00.000Z,2022-07-01T21:00:00.000Z,F8:A2:D6:47:9E:23,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Walnut Grove Avenue,El Monte,1087,91770
34.0461998,-84.25238037,Flock-7F60F3,0,20210308-00000,2021-02-28T16:00:00.000Z,2021-03-08T19:00:00.000Z,2022-07-02T17:00:00.000Z,70:C9:4E:7F:60:F3,,infra,,2,0,?,?,?,False,6,,wpa2,US,GA,Kimball Bridge Road,Johns Creek,3836,30022
34.05932236,-118.38459778,Flock-7ACC31,0,20240521-00000,2024-05-22T01:00:00.000Z,2024-05-21T22:00:00.000Z,2024-05-21T22:00:00.000Z,14:5A:FC:7A:CC:31,,infra,,2,0,?,?,?,False,153,0,wpa2,US,CA,West Olympic Boulevard,,,90064
34.06180954,-84.17185211,Flock-8932F1,0,20211219-00000,2021-12-19T08:00:00.000Z,2021-12-19T06:00:00.000Z,2021-12-19T06:00:00.000Z,74:4C:A1:89:32:F1,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,Medlock Bridge Road,Johns Creek,,30097
34.0690155,-118.02841949,Flock-68E133,0,20220516-00000,2022-05-10T10:00:00.000Z,2022-05-16T00:00:00.000Z,2022-05-16T00:00:00.000Z,74:4C:A1:68:E1:33,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Valley Boulevard,El Monte,,91789
34.07067108,-118.09052277,Flock-7EC34D,0,20211209-00000,2021-12-09T20:00:00.000Z,2021-12-09T20:00:00.000Z,2021-12-09T20:00:00.000Z,74:4C:A1:7E:C3:4D,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,San Gabriel Boulevard,,,91770
34.07077789,-117.40695953,Flock-68E55F,5,20211124-00000,2021-11-24T19:00:00.000Z,2022-02-06T16:00:00.000Z,2022-02-06T16:00:00.000Z,74:4C:A1:68:E5:5F,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Valley Boulevard,,18200,92316
34.07107925,-117.40714264,Flock-BFF2DF,4,20220124-00000,2022-01-22T21:00:00.000Z,2022-02-06T16:00:00.000Z,2022-02-06T16:00:00.000Z,3C:91:80:BF:F2:DF,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Valley Boulevard,,18198,92316
34.07128143,-117.407547,Flock-3D1A53,5,20220114-00000,2022-01-14T13:00:00.000Z,2022-02-07T15:00:00.000Z,2022-02-07T15:00:00.000Z,D8:F3:BC:3D:1A:53,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,Valley Boulevard,,18184,92316
34.07194901,-117.9074173,Flock-68DA9D,0,20210920-00000,2021-09-20T19:00:00.000Z,2021-09-20T19:00:00.000Z,2021-09-20T19:00:00.000Z,74:4C:A1:68:DA:9D,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,San Bernardino Freeway,West Covina,,91791
34.07208252,-117.90719604,Flock-68DF4D,0,20211022-00000,2021-10-22T21:00:00.000Z,2021-10-22T22:00:00.000Z,2021-10-22T22:00:00.000Z,74:4C:A1:68:DF:4D,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,San Bernardino Freeway,West Covina,,91791
34.07478333,-118.07315826,Flock-7EFDC9,0,20200111-00000,2020-01-12T00:00:00.000Z,2020-01-11T17:00:00.000Z,2022-07-01T21:00:00.000Z,B8:27:EB:7E:FD:C9,,infra,,2,0,?,?,?,False,7,,wpa2,US,CA,Rosemead Boulevard,El Monte,3653,91770
34.07928467,-117.87260437,Flock-893339,0,20211214-00000,2021-12-12T19:00:00.000Z,2021-12-14T16:00:00.000Z,2021-12-14T16:00:00.000Z,74:4C:A1:89:33:39,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,South Grand Avenue,El Monte,,91724
34.08032227,-84.12638092,Flock-C0A4AF,0,20220710-00000,2022-07-08T20:00:00.000Z,2022-07-10T04:00:00.000Z,2022-07-10T04:00:00.000Z,E0:0A:F6:C0:A4:AF,,infra,,2,0,?,?,?,False,161,,wpa2,US,GA,Olde Atlanta Parkway,,,30024
34.08887863,-117.65129852,Flock-6234A7,0,20220510-00000,2022-05-10T09:00:00.000Z,2022-05-10T19:00:00.000Z,2022-05-10T19:00:00.000Z,00:F4:8D:62:34:A7,,infra,,2,0,?,?,?,False,48,,wpa2,US,CA,Euclid Avenue,,,91785-9998
34.09249115,-83.61373138,Flock-6F47F9,0,20231017-00000,2023-10-17T16:00:00.000Z,2023-10-17T10:00:00.000Z,2023-10-17T10:00:00.000Z,9C:2F:9D:6F:47:F9,,infra,,2,0,?,?,?,False,36,,wpa2,US,GA,Winder Highway,,,30549
34.10808182,-117.82218933,Flock-BDB0BD,2,20220213-00000,2022-02-13T21:00:00.000Z,2022-02-26T01:00:00.000Z,2022-02-26T01:00:00.000Z,3C:91:80:BD:B0:BD,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Orange Freeway,,,91773
34.11161423,-118.1270752,Flock-7ACFE5,0,20220609-00000,2022-06-09T17:00:00.000Z,2022-06-09T17:00:00.000Z,2022-06-09T17:00:00.000Z,14:5A:FC:7A:CF:E5,,infra,,2,0,?,?,?,False,165,,wpa2,US,CA,Huntington Drive,,,91108
34.11225128,-118.12624359,Flock-3D1BFD,0,20211006-00000,2021-10-06T19:00:00.000Z,2021-10-06T20:00:00.000Z,2021-10-06T20:00:00.000Z,D8:F3:BC:3D:1B:FD,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,Huntington Drive,,,91108
34.11342621,-118.10409546,Flock-865615,0,20220531-00000,2022-05-30T17:00:00.000Z,2022-05-31T14:00:00.000Z,2022-05-31T14:00:00.000Z,14:5A:FC:86:56:15,,infra,,2,0,?,?,?,False,165,,wpa2,US,CA,Longden Drive,,,91778
34.12055588,-117.87257385,Flock-96A2B5,0,20220422-00000,2022-04-22T13:00:00.000Z,2022-04-22T19:00:00.000Z,2022-04-22T19:00:00.000Z,14:5A:FC:96:A2:B5,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,South Grand Avenue,,,91740
34.12150955,-117.68332672,Flock-68E16D,0,20220607-00000,2022-06-07T08:00:00.000Z,2022-06-07T10:00:00.000Z,2022-06-07T11:00:00.000Z,74:4C:A1:68:E1:6D,,infra,,2,0,?,?,?,False,40,,wpa2,US,CA,Baseline Road,,,91784
34.12659073,-118.09191132,Flock-7EC353,0,20211111-00000,2021-11-11T16:00:00.000Z,2021-11-11T17:00:00.000Z,2021-11-11T17:00:00.000Z,74:4C:A1:7E:C3:53,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Huntington Drive,,,91775
34.12663651,-118.09275818,Flock-7EBA1B,0,20211212-00000,2021-12-10T11:00:00.000Z,2021-12-12T11:00:00.000Z,2021-12-12T11:00:00.000Z,74:4C:A1:7E:BA:1B,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Huntington Drive,,,91775
34.12667465,-118.0922699,Flock-8964C9,1,20220121-00000,2022-01-21T13:00:00.000Z,2022-04-13T16:00:00.000Z,2022-04-13T16:00:00.000Z,74:4C:A1:89:64:C9,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Huntington Drive,,,91775
34.13545227,-117.96714783,Flock-A4E005,2,20200719-00000,2020-07-19T16:00:00.000Z,2021-02-20T15:00:00.000Z,2022-07-02T02:00:00.000Z,3C:91:80:A4:E0:05,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Foothill Freeway,,,91010
34.13573837,-118.09396362,Flock-7ECAA3,0,20220311-00000,2022-03-11T16:00:00.000Z,2022-03-11T17:00:00.000Z,2022-03-11T17:00:00.000Z,74:4C:A1:7E:CA:A3,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,East California Boulevard,Pasadena,2732,91107
34.13583374,-118.08283997,Flock-8C7FFD,0,20220227-00000,2022-02-27T12:00:00.000Z,2022-02-27T14:00:00.000Z,2022-02-27T14:00:00.000Z,74:4C:A1:8C:7F:FD,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,East California Boulevard,Pasadena,3310,91107
34.14849091,-118.0665741,Flock-7DB785,0,20211019-00000,2021-10-19T15:00:00.000Z,2021-10-19T16:00:00.000Z,2021-10-19T16:00:00.000Z,D8:F3:BC:7D:B7:85,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Foothill Freeway,,,91024
34.16555405,-118.29496002,Flock-3D2845,0,20220919-00000,2021-05-28T04:00:00.000Z,2022-09-19T14:00:00.000Z,2022-09-19T16:00:00.000Z,D8:F3:BC:3D:28:45,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Flower Street,Glendale,,91201
34.17505646,-84.77125549,Flock-281409,0,20220528-00000,2022-05-28T13:00:00.000Z,2022-05-28T19:00:00.000Z,2022-05-28T19:00:00.000Z,94:08:53:28:14:09,,infra,,2,0,?,?,?,False,48,,wpa2,US,GA,East Main Street,,,30120:30121
34.21302032,-92.00482178,Flock-3D1B73,0,20210805-00000,2021-07-29T12:00:00.000Z,2021-08-05T18:00:00.000Z,2022-08-01T17:00:00.000Z,D8:F3:BC:3D:1B:73,,infra,,2,0,?,?,?,False,1,,wpa2,US,AR,West Harding Avenue,Pine Bluff,,71601
34.23548889,-84.28257751,Flock-7DBAE9,0,20220427-00000,2022-04-27T00:00:00.000Z,2022-04-27T08:00:00.000Z,2022-04-27T08:00:00.000Z,D8:F3:BC:7D:BA:E9,,infra,,2,0,?,?,?,False,1,,wpa2,US,GA,Cumming Highway,,13320,30040
34.23803711,-84.46121216,Flock-7ACD41,0,20220622-00000,2022-06-22T10:00:00.000Z,2022-06-22T07:00:00.000Z,2022-06-22T07:00:00.000Z,14:5A:FC:7A:CD:41,,infra,,2,0,?,?,?,False,40,,wpa2,US,GA,Cumming Highway,,1744,30114
34.25449371,-119.21022797,Flock-68E4E1,0,20220508-00000,2022-04-18T22:00:00.000Z,2022-05-08T19:00:00.000Z,2022-05-08T19:00:00.000Z,74:4C:A1:68:E4:E1,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,South Victoria Avenue,Ventura,,93009
34.25501251,-119.21061707,Flock-895785,0,20220208-00000,2022-02-07T12:00:00.000Z,2022-02-08T02:00:00.000Z,2022-02-08T02:00:00.000Z,74:4C:A1:89:57:85,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,South Victoria Avenue,Ventura,2157,93003
34.28450012,-89.02664948,Flock-6FE757,0,20220616-00000,2022-06-16T08:00:00.000Z,2022-06-16T06:00:00.000Z,2022-06-16T06:00:00.000Z,14:5A:FC:6F:E7:57,,infra,,2,0,?,?,?,False,153,,wpa2,US,MS,Royal Oak Drive,,38,38863
34.55831146,-86.99897766,Flock-27B614,5,20220907-00000,2022-09-07T15:00:00.000Z,2023-01-06T08:00:00.000Z,2023-01-06T09:00:00.000Z,B8:27:EB:27:B6:14,,infra,,2,0,?,?,?,False,7,,wpa2,US,AL,Spring Avenue Southwest,Decatur,,35603
34.63628006,-86.04240417,Flock-225F16,2,20230908-00000,2023-09-08T15:00:00.000Z,2023-09-11T16:00:00.000Z,2023-09-11T16:00:00.000Z,08:3A:88:22:5F:16,,infra,,2,0,?,?,?,False,1,,wpa2,US,AL,North Broad Street,,,35769
34.67177582,-82.83488464,Flock-3D251F,0,20210827-00000,2021-08-27T15:00:00.000Z,2021-08-27T13:00:00.000Z,2021-08-27T13:00:00.000Z,D8:F3:BC:3D:25:1F,,infra,,2,0,?,?,?,False,1,,wpa2,US,SC,Madren Center Drive,,,29634-5365
34.67963409,-82.82640839,Flock-8A43E9,1,20201209-00000,2020-09-04T16:00:00.000Z,2020-12-09T09:00:00.000Z,2022-07-05T05:00:00.000Z,E8:D0:FC:8A:43:E9,,infra,,2,0,?,?,?,False,1,,wpa2,US,SC,Old Greenville Highway,,600,29631
34.69316101,-82.97698975,Flock-7DD39D,0,20210907-00000,2021-09-07T12:00:00.000Z,2021-09-07T12:00:00.000Z,2021-09-07T12:00:00.000Z,D8:F3:BC:7D:D3:9D,,infra,,2,0,?,?,?,False,1,,wpa2,US,SC,Bypass 123,,,29679
34.85162735,-117.08330536,Flock-564AF3,1,20210804-00000,2021-08-04T14:00:00.000Z,2021-08-06T22:00:00.000Z,2022-07-04T00:00:00.000Z,E4:AA:EA:56:4A:F3,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Lenwood Road,,,92347
34.85175323,-82.40225983,Flock-7F6D29,0,20201009-00000,2020-10-09T21:00:00.000Z,2020-10-09T18:00:00.000Z,2022-07-05T22:00:00.000Z,70:C9:4E:7F:6D:29,,infra,,2,0,?,?,?,False,1,,wpa2,US,SC,West Washington Street,Greenville,,29601
34.85239792,-117.08321381,Flock-7DBDFD,0,20210716-00000,2021-07-16T19:00:00.000Z,2021-07-16T13:00:00.000Z,2022-07-04T00:00:00.000Z,D8:F3:BC:7D:BD:FD,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Lenwood Road,,,92347
34.87734222,-82.36273193,Flock-3D273B,0,20210703-00000,2021-07-03T14:00:00.000Z,2021-07-03T17:00:00.000Z,2022-07-05T23:00:00.000Z,D8:F3:BC:3D:27:3B,,infra,,2,0,?,?,?,False,6,,wpa2,US,SC,Wade Hampton Boulevard,Greenville,,29614
34.88180161,-92.11149597,Flock-62348D,6,20210703-00000,2021-07-03T20:00:00.000Z,2021-09-23T12:00:00.000Z,2021-09-23T12:00:00.000Z,00:F4:8D:62:34:8D,,infra,,2,0,?,?,?,False,1,,wpa2,US,AR,US 67;US 167,,,72076-3157
34.89850616,-117.0215683,Flock-479B85,0,20201221-00000,2020-08-31T06:00:00.000Z,2020-12-21T01:00:00.000Z,2022-07-04T05:00:00.000Z,F8:A2:D6:47:9B:85,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,East Main Street,,,92311
34.96233368,-89.73777771,Flock-21D0F3,0,20210131-00000,2021-01-31T11:00:00.000Z,2021-01-31T10:00:00.000Z,2022-06-23T02:00:00.000Z,80:30:49:21:D0:F3,,infra,,2,0,?,?,?,False,6,,wpa2,US,MS,Goodman Road,,14245,38654
34.9623642,-89.73776245,Flock-3D15DD,2,20210305-00000,2021-03-05T14:00:00.000Z,2021-04-05T10:00:00.000Z,2022-06-23T02:00:00.000Z,D8:F3:BC:3D:15:DD,,infra,,2,0,?,?,?,False,6,,wpa2,US,MS,Goodman Road,,14246,38654
34.97811127,-92.03292084,Flock-6FE587,0,20220314-00000,2022-03-14T22:00:00.000Z,2022-03-14T20:00:00.000Z,2022-03-14T20:00:00.000Z,14:5A:FC:6F:E5:87,,infra,,2,0,?,?,?,False,1,,wpa2,US,AR,Goings Drive,,1,72023
34.97933578,-92.0381012,Flock-895EB7,0,20220314-00000,2022-03-14T22:00:00.000Z,2022-03-14T20:00:00.000Z,2022-03-14T20:00:00.000Z,74:4C:A1:89:5E:B7,,infra,,2,0,?,?,?,False,11,,wpa2,US,AR,South Rockwood Road,,,72023
34.97941208,-80.98830414,Flock-91DC53,0,20220522-00000,2022-05-22T19:00:00.000Z,2022-05-22T17:00:00.000Z,2022-05-22T22:00:00.000Z,14:5A:FC:91:DC:53,,infra,,2,0,?,?,?,False,153,,wpa2,US,SC,I 77,,,
34.98697662,-80.97348022,Flock-127C05,0,20211210-00000,2021-12-10T15:00:00.000Z,2021-12-10T14:00:00.000Z,2021-12-10T14:00:00.000Z,80:30:49:12:7C:05,,infra,,2,0,?,?,?,False,6,,wpa2,US,SC,Founder's Trail,York,,29716
35.00919342,-89.6889267,Flock-A4EE39,3,20210509-00000,2021-05-09T13:00:00.000Z,2021-10-03T15:00:00.000Z,2021-10-03T15:00:00.000Z,3C:91:80:A4:EE:39,,infra,,2,0,?,?,?,False,11,,wpa2,US,TN,South Byhalia Road,,,38017
35.02053833,-89.78404236,Flock-21D16F,0,20210906-00000,2021-09-06T14:00:00.000Z,2021-09-06T12:00:00.000Z,2021-09-06T12:00:00.000Z,80:30:49:21:D1:6F,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,East Shelby Drive,,8381,38125
35.03496933,-89.7960968,Flock-5650BD,3,20200818-00000,2020-08-17T22:00:00.000Z,2021-06-03T05:00:00.000Z,2022-06-23T01:00:00.000Z,E4:AA:EA:56:50:BD,,infra,,2,0,?,?,?,False,6,,wpa2,US,TN,Lowrance Road,,4195,38125
35.0379715,-89.79747009,Flock-809B21,4,20200816-00000,2020-08-16T21:00:00.000Z,2020-10-17T19:00:00.000Z,2022-06-23T01:00:00.000Z,E4:AA:EA:80:9B:21,,infra,,2,0,?,?,?,False,6,,wpa2,US,TN,Bill Morris Parkway,,,38125
35.03860092,-89.82440948,Flock-F9855A,1,20200303-00000,2020-03-03T11:00:00.000Z,2020-05-01T15:00:00.000Z,2022-06-23T00:00:00.000Z,B8:27:EB:F9:85:5A,,infra,,2,0,?,?,?,False,7,,wpa2,US,TN,Kingsland Drive,Memphis,7191,38125
35.04753113,-89.75463867,Flock-BAE01F,0,20200816-00000,2020-08-16T21:00:00.000Z,2020-08-16T20:00:00.000Z,2022-06-23T02:00:00.000Z,3C:91:80:BA:E0:1F,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,Winchester Road,,9241,38138
35.04935837,-89.80576324,Flock-68DF35,0,20220215-00000,2022-02-15T18:00:00.000Z,2022-02-15T17:00:00.000Z,2022-02-15T17:00:00.000Z,74:4C:A1:68:DF:35,,infra,,2,0,?,?,?,False,6,,wpa2,US,TN,Winchester Road,Memphis,,38125
35.04949188,-89.80606079,Flock-564FE1,2,20210707-00000,2021-07-07T17:00:00.000Z,2022-01-21T22:00:00.000Z,2022-01-21T22:00:00.000Z,E4:AA:EA:56:4F:E1,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,Winchester Road,Memphis,,38125
35.04956818,-89.80604553,Flock-564DB9,5,20200527-00000,2020-05-27T20:00:00.000Z,2020-12-01T23:00:00.000Z,2022-06-23T00:00:00.000Z,E4:AA:EA:56:4D:B9,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,Winchester Road,Memphis,,38125
35.04967117,-89.80715942,Flock-7F5B7D,5,20200321-00000,2020-03-21T17:00:00.000Z,2020-10-23T22:00:00.000Z,2022-06-23T00:00:00.000Z,70:C9:4E:7F:5B:7D,,infra,,2,0,?,?,?,False,6,,wpa2,US,TN,Winchester Road,Memphis,7706,38125
35.04979324,-89.80737305,Flock-8933BB,1,20220201-00000,2022-02-01T14:00:00.000Z,2022-02-22T12:00:00.000Z,2022-02-22T12:00:00.000Z,74:4C:A1:89:33:BB,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,Winchester Road,Memphis,7684,38125
35.05247879,-90.02496338,Flock-564E47,0,20200831-00000,2020-08-31T18:00:00.000Z,2020-09-01T09:00:00.000Z,2022-08-11T15:00:00.000Z,E4:AA:EA:56:4E:47,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,Elvis Presley Boulevard,Memphis,,38116
35.05516434,-90.06003571,Flock-479BC1,0,20200921-00000,2020-09-21T13:00:00.000Z,2020-09-21T12:00:00.000Z,2022-08-11T12:00:00.000Z,F8:A2:D6:47:9B:C1,,infra,,2,0,?,?,?,False,6,,wpa2,US,TN,East Mitchell Road,Memphis,,38109
35.055439,-89.73897552,Flock-BDAD4D,1,20201225-00000,2020-12-24T15:00:00.000Z,2021-01-03T10:00:00.000Z,2022-06-23T02:00:00.000Z,3C:91:80:BD:AD:4D,,infra,,2,0,?,?,?,False,11,,wpa2,US,TN,Poplar Avenue,,9552,38139
35.0591774,-89.7596817,Flock-8926D5,0,20220311-00000,2022-03-11T15:00:00.000Z,2022-03-11T14:00:00.000Z,2022-03-11T14:00:00.000Z,74:4C:A1:89:26:D5,,infra,,2,0,?,?,?,False,6,,wpa2,US,TN,Forest Hill-Irene Road,,3314,38138
35.0592804,-80.87630463,Flock-3D1B41,0,20211109-00000,2021-10-31T17:00:00.000Z,2021-11-09T15:00:00.000Z,2021-11-09T15:00:00.000Z,D8:F3:BC:3D:1B:41,,infra,,2,0,?,?,?,False,11,,wpa2,US,NC,Lancaster Highway,,12701,28134
35.0654068,-106.56882477,Flock-80A177,0,20210516-00000,2021-04-24T12:00:00.000Z,2021-05-16T08:00:00.000Z,2022-07-09T20:00:00.000Z,E4:AA:EA:80:A1:77,,infra,,2,0,?,?,?,False,11,,wpa2,US,NM,Kathryn Avenue Southeast,Albuquerque,7098,87108
35.0700264,-89.88545227,Flock-479EE1,3,20200812-00000,2020-08-12T12:00:00.000Z,2020-09-01T12:00:00.000Z,2022-06-22T23:00:00.000Z,F8:A2:D6:47:9E:E1,,infra,,2,0,?,?,?,False,11,,wpa2,US,TN,South Mendenhall Road,Memphis,2882,38115
35.07428741,-89.88494873,Flock-BAE85F,3,20200901-00000,2020-08-06T07:00:00.000Z,2020-09-01T12:00:00.000Z,2022-06-22T23:00:00.000Z,3C:91:80:BA:E8:5F,,infra,,2,0,?,?,?,False,6,,wpa2,US,TN,South Mendenhall Road,Memphis,2725,38115
35.08472824,-89.9609375,Flock-BDBACB,6,20200919-00000,2020-09-19T22:00:00.000Z,2021-07-03T05:00:00.000Z,2022-06-22T21:00:00.000Z,3C:91:80:BD:BA:CB,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,Lamar Avenue,Memphis,,38118
35.10182953,-89.85985565,Flock-565081,0,20200803-00000,2020-08-03T13:00:00.000Z,2020-08-03T16:00:00.000Z,2022-06-22T23:00:00.000Z,E4:AA:EA:56:50:81,,infra,,2,0,?,?,?,False,11,,wpa2,US,TN,Poplar Avenue,Memphis,,38120
35.11712646,-89.90907288,Flock-564B65,0,20200715-00000,2020-07-15T20:00:00.000Z,2020-07-15T19:00:00.000Z,2022-06-22T22:00:00.000Z,E4:AA:EA:56:4B:65,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,Poplar Avenue,Memphis,,38117
35.1235466,-80.70774078,Flock-7DBD17,0,20220321-00000,2022-03-21T15:00:00.000Z,2022-03-21T15:00:00.000Z,2022-03-21T15:00:00.000Z,D8:F3:BC:7D:BD:17,,infra,,2,0,?,?,?,False,6,,wpa2,US,NC,Matthews Township Parkway,,,28105
35.12809372,-90.06665039,Flock-564D4D,2,20200822-00000,2020-08-22T00:00:00.000Z,2020-08-30T20:00:00.000Z,2022-08-11T11:00:00.000Z,E4:AA:EA:56:4D:4D,,infra,,2,0,?,?,?,False,11,,wpa2,US,TN,Riverside Drive,Memphis,,38126
35.13527679,-89.99034119,Flock-7F672B,0,20210127-00000,2021-01-27T17:00:00.000Z,2021-01-27T16:00:00.000Z,2022-06-22T20:00:00.000Z,70:C9:4E:7F:67:2B,,infra,,2,0,?,?,?,False,6,,wpa2,US,TN,South Cooper Street,Memphis,,38104
35.13547516,-90.03297424,Flock-E05AFD,1,20210629-00000,2021-06-29T12:00:00.000Z,2021-10-05T10:00:00.000Z,2021-10-05T10:00:00.000Z,80:30:49:E0:5A:FD,,infra,,2,0,?,?,?,False,11,,wpa2,US,TN,Linden Avenue,Memphis,811,38126
35.13565826,-90.034935,Flock-32F3F1,0,20201202-00000,2020-12-02T17:00:00.000Z,2020-12-02T15:00:00.000Z,2022-08-11T15:00:00.000Z,E4:AA:EA:32:F3:F1,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,Union Avenue,Memphis,737,38104
35.13575745,-90.0355072,Flock-44453C,0,20191106-00000,2019-11-06T13:00:00.000Z,2019-11-06T22:00:00.000Z,2022-08-11T14:00:00.000Z,B8:27:EB:44:45:3C,,infra,,2,0,?,?,?,False,7,,wpa2,US,TN,Union Avenue,Memphis,737,38104
35.1360054,-89.83868408,Flock-146943,1,20191101-00000,2019-11-01T16:00:00.000Z,2019-11-05T15:00:00.000Z,2022-06-23T00:00:00.000Z,B8:27:EB:14:69:43,,infra,,2,0,?,?,?,False,7,,wpa2,US,TN,Farm Road,Memphis,,38120
35.13926697,-89.83786774,Flock-80A0C3,0,20210905-00000,2021-09-05T16:00:00.000Z,2021-09-05T18:00:00.000Z,2021-09-05T18:00:00.000Z,E4:AA:EA:80:A0:C3,,infra,,2,0,?,?,?,False,11,,wpa2,US,TN,Chickasaw Trail,Memphis,,38120
35.13962555,-90.05180359,Flock-BDC0E9,0,20210314-00000,2021-03-12T23:00:00.000Z,2021-03-14T17:00:00.000Z,2022-08-11T13:00:00.000Z,3C:91:80:BD:C0:E9,,infra,,2,0,?,?,?,False,6,,wpa2,US,TN,South B. B. King Boulevard,Memphis,,38109
35.14932632,-89.94972992,Flock-864DA1,0,20220323-00000,2022-03-23T15:00:00.000Z,2022-03-23T15:00:00.000Z,2022-03-23T15:00:00.000Z,14:5A:FC:86:4D:A1,,infra,,2,0,?,?,?,False,11,,wpa2,US,TN,Summer Avenue,Memphis,3339,38122
35.14956284,-89.94959259,Flock-654321,0,20220323-00000,2022-03-23T15:00:00.000Z,2022-03-23T15:00:00.000Z,2022-03-23T15:00:00.000Z,F6:7F:D7:D2:79:4C,,infra,,2,0,?,?,?,False,149,,wpa2,US,TN,Summer Avenue,Memphis,3352,38122
35.16323853,-89.86644745,Flock-4FFAB0,0,20191024-00000,2019-10-23T19:00:00.000Z,2019-10-24T19:00:00.000Z,2022-06-22T23:00:00.000Z,B8:27:EB:4F:FA:B0,,infra,,2,0,?,?,?,False,7,,wpa2,US,TN,Isaac Hayes Memorial Highway,Memphis,,38134
35.16363907,-89.86003876,Flock-3D1855,0,20210727-00000,2021-07-27T17:00:00.000Z,2021-07-27T16:00:00.000Z,2022-06-22T23:00:00.000Z,D8:F3:BC:3D:18:55,,infra,,2,0,?,?,?,False,6,,wpa2,US,TN,Sycamore View Road,Memphis,,38134
35.16626358,-89.83200073,Flock-A4E373,0,20200823-00000,2020-08-22T19:00:00.000Z,2020-08-23T21:00:00.000Z,2022-06-23T00:00:00.000Z,3C:91:80:A4:E3:73,,infra,,2,0,?,?,?,False,6,,wpa2,US,TN,Raleigh-Lagrange Road,,6892,38018
35.16728592,-89.79389954,Flock-74A727,0,20200830-00000,2020-08-30T10:00:00.000Z,2020-08-30T09:00:00.000Z,2022-06-23T01:00:00.000Z,B8:27:EB:74:A7:27,,infra,,2,0,?,?,?,False,7,,wpa2,US,TN,Chickering Cove,Memphis,1552,38016
35.16844559,-89.83672333,Flock-809D23,0,20200821-00000,2020-08-21T14:00:00.000Z,2020-08-21T12:00:00.000Z,2022-06-23T00:00:00.000Z,E4:AA:EA:80:9D:23,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,Whitten Road,Memphis,1578,38134
35.18849945,-89.92836761,Flock-7F6429,0,20200822-00000,2020-08-22T22:00:00.000Z,2020-08-22T22:00:00.000Z,2022-06-22T21:00:00.000Z,70:C9:4E:7F:64:29,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,Jackson Avenue,Memphis,4167,38128
35.1886673,-89.81397247,Flock-BDC9FD,0,20210721-00000,2021-07-21T18:00:00.000Z,2021-07-21T17:00:00.000Z,2022-06-23T00:00:00.000Z,3C:91:80:BD:C9:FD,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,Appling Road,Memphis,,38133
35.19534683,-89.79136658,Flock-809A33,0,20200901-00000,2020-08-06T10:00:00.000Z,2020-09-01T12:00:00.000Z,2022-06-23T01:00:00.000Z,E4:AA:EA:80:9A:33,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,Isaac Hayes Memorial Highway,Memphis,,38133
35.20112991,-89.83841705,Flock-A4E417,0,20200823-00000,2020-08-22T21:00:00.000Z,2020-08-23T21:00:00.000Z,2022-06-23T00:00:00.000Z,3C:91:80:A4:E4:17,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,Summer Avenue,,6727,38134
35.20446396,-89.78226471,Flock-127D3B,0,20201021-00000,2020-10-15T21:00:00.000Z,2020-10-21T15:00:00.000Z,2022-06-23T01:00:00.000Z,80:30:49:12:7D:3B,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,Stage Road,,8434,38133
35.20475388,-89.7964325,Flock-896429,0,20220221-00000,2022-01-24T21:00:00.000Z,2022-02-21T18:00:00.000Z,2022-02-21T18:00:00.000Z,74:4C:A1:89:64:29,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,Stage Road,,,38133
35.20547867,-89.81437683,Flock-21D4A3,0,20210702-00000,2021-07-02T20:00:00.000Z,2021-07-02T18:00:00.000Z,2022-06-23T00:00:00.000Z,80:30:49:21:D4:A3,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,Brother Boulevard,,,38133
35.24923325,-82.32778168,Flock-7DD1EB,0,20210829-00000,2021-08-29T13:00:00.000Z,2021-08-29T12:00:00.000Z,2021-08-29T12:00:00.000Z,D8:F3:BC:7D:D1:EB,,infra,,2,0,?,?,?,False,11,,wpa2,US,NC,Holbert Cove Road,,,28773
35.25500488,-89.7488327,Flock-479F77,0,20200823-00000,2020-08-22T18:00:00.000Z,2020-08-23T21:00:00.000Z,2022-06-23T02:00:00.000Z,F8:A2:D6:47:9F:77,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,Canada Road,,4839,38002
35.25500488,-89.7488327,Flock-47A271,0,20200823-00000,2020-08-22T18:00:00.000Z,2020-08-23T21:00:00.000Z,2022-06-23T02:00:00.000Z,F8:A2:D6:47:A2:71,,infra,,2,0,?,?,?,False,6,,wpa2,US,TN,Canada Road,,4839,38002
35.25801849,-89.86264801,Flock-5798F1,0,20240509-00000,2024-05-09T19:00:00.000Z,2024-05-09T19:00:00.000Z,2024-05-09T20:00:00.000Z,D0:39:57:57:98:F1,,infra,,2,0,?,?,?,False,48,0,wpa2,US,TN,Old Brownsville Road,,6033,38135
35.26906204,-89.71341705,Flock-479F73,0,20200823-00000,2020-08-22T18:00:00.000Z,2020-08-23T21:00:00.000Z,2022-06-23T03:00:00.000Z,F8:A2:D6:47:9F:73,,infra,,2,0,?,?,?,False,11,,wpa2,US,TN,US 70;US 79,,10490,38002
35.35263062,-80.81551361,Flock-BDB8AB,5,20200625-00000,2020-06-25T16:00:00.000Z,2020-08-11T13:00:00.000Z,2022-07-09T04:00:00.000Z,3C:91:80:BD:B8:AB,,infra,,2,0,?,?,?,False,1,,wpa2,US,NC,Canipe Drive,Charlotte,4100,28269
35.37157822,-89.88115692,Flock-7F6B3B,0,20200821-00000,2020-08-21T09:00:00.000Z,2020-08-21T07:00:00.000Z,2022-06-22T23:00:00.000Z,70:C9:4E:7F:6B:3B,,infra,,2,0,?,?,?,False,6,,wpa2,US,TN,US 51,,,38053
35.37262726,-80.72203064,Flock-675BA5,0,20220319-00000,2022-03-19T22:00:00.000Z,2022-03-19T22:00:00.000Z,2022-03-19T22:00:00.000Z,94:08:53:67:5B:A5,,infra,,2,0,?,?,?,False,6,,wpa2,US,NC,Concord Mills Boulevard,Concord,,28027:28075
35.55518341,-80.86038971,Flock-4444DD,0,20210531-00000,2021-05-30T21:00:00.000Z,2021-05-31T05:00:00.000Z,2022-07-09T01:00:00.000Z,D8:F3:BC:44:44:DD,,infra,,2,0,?,?,?,False,6,,wpa2,US,NC,Williamson Road,,861,28117
35.58557892,-80.87412262,Flock-864963,0,20220628-00000,2022-06-28T19:00:00.000Z,2022-06-28T14:00:00.000Z,2022-06-28T17:00:00.000Z,14:5A:FC:86:49:63,,infra,,2,0,?,?,?,False,44,,wpa2,US,NC,Williamson Road,,298,28117
35.58930969,-80.83944702,Flock-895A93,0,20220615-00000,2022-06-07T23:00:00.000Z,2022-06-15T09:00:00.000Z,2022-06-15T10:00:00.000Z,74:4C:A1:89:5A:93,,infra,,2,0,?,?,?,False,157,,wpa2,US,NC,West Plaza Drive,,,28115
35.59389877,-80.86122894,Flock-7DCC99,0,20210914-00000,2021-09-13T09:00:00.000Z,2021-09-14T09:00:00.000Z,2021-09-14T09:00:00.000Z,D8:F3:BC:7D:CC:99,,infra,,2,0,?,?,?,False,6,,wpa2,US,NC,River Highway,,,28117
35.59473038,-80.86528778,Flock-7DC531,2,20211027-00000,2021-10-27T14:00:00.000Z,2021-11-14T20:00:00.000Z,2021-11-14T20:00:00.000Z,D8:F3:BC:7D:C5:31,,infra,,2,0,?,?,?,False,11,,wpa2,US,NC,River Highway,,498,28117
35.60353088,-82.36441803,Flock-6769F7,0,20230104-00000,2023-01-03T12:00:00.000Z,2023-01-04T13:00:00.000Z,2023-01-04T13:00:00.000Z,94:08:53:67:69:F7,,infra,,2,0,?,?,?,False,149,,wpa2,US,NC,West State Street,,,28711
35.71303177,-83.51226044,Flock-BDCB39,0,20201104-00000,2020-11-04T10:00:00.000Z,2020-11-04T11:00:00.000Z,2022-07-03T19:00:00.000Z,3C:91:80:BD:CB:39,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,Parkway,,,37883
35.71316147,-83.5124054,Flock-C0A90B,0,20220629-00000,2022-06-26T16:00:00.000Z,2022-06-29T14:00:00.000Z,2022-06-29T15:00:00.000Z,E0:0A:F6:C0:A9:0B,,infra,,2,0,?,?,?,False,36,,wpa2,US,TN,Parkway,,,37883
35.72439194,-83.51018524,Flock-432081,0,20220702-00000,2022-06-29T19:00:00.000Z,2022-07-02T13:00:00.000Z,2022-07-02T14:00:00.000Z,94:08:53:43:20:81,,infra,,2,0,?,?,?,False,165,,wpa2,US,TN,Parkway,,,37883
35.72481918,-83.51017761,Flock-89888F,0,20220629-00000,2022-06-27T11:00:00.000Z,2022-06-29T14:00:00.000Z,2022-06-29T15:00:00.000Z,74:4C:A1:89:88:8F,,infra,,2,0,?,?,?,False,153,,wpa2,US,TN,Parkway,,,37883
35.75759506,-83.99156189,Flock-3D1C79,0,20220306-00000,2022-02-28T16:00:00.000Z,2022-03-06T05:00:00.000Z,2022-03-06T05:00:00.000Z,D8:F3:BC:3D:1C:79,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,US 129,,,37803-5865
35.77388763,-83.53862762,Flock-7DC1F3,0,20211213-00000,2021-12-13T18:00:00.000Z,2021-12-13T19:00:00.000Z,2021-12-13T19:00:00.000Z,D8:F3:BC:7D:C1:F3,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,Parkway,,,37863
35.79657745,-83.54389954,Flock-7DC441,0,20220320-00000,2022-03-19T16:00:00.000Z,2022-03-20T10:00:00.000Z,2022-03-20T10:00:00.000Z,D8:F3:BC:7D:C4:41,,infra,,2,0,?,?,?,False,6,,wpa2,US,TN,Veterans Boulevard,,,37863
35.80248642,-83.58374023,Flock-7DBA8D,0,20220629-00000,2022-06-26T18:00:00.000Z,2022-06-29T14:00:00.000Z,2022-06-29T15:00:00.000Z,D8:F3:BC:7D:BA:8D,,infra,,2,0,?,?,?,False,153,,wpa2,US,TN,Wears Valley Road,,332,37863
35.80290985,-83.56726074,Flock-5D0ED5,0,20200223-00000,2020-01-25T18:00:00.000Z,2020-02-23T17:00:00.000Z,2022-07-03T18:00:00.000Z,B8:27:EB:5D:0E:D5,,infra,,2,0,?,?,?,False,7,,wpa2,US,TN,Teaster Lane,,,37862
35.81861115,-84.02728271,Flock-2819D9,0,20211028-00000,2021-10-28T09:00:00.000Z,2021-10-28T06:00:00.000Z,2021-10-28T06:00:00.000Z,94:08:53:28:19:D9,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,Topside Road,,2906,37777
35.82134628,-83.57790375,Flock-864ED3,0,20220629-00000,2022-06-27T11:00:00.000Z,2022-06-29T14:00:00.000Z,2022-06-29T15:00:00.000Z,14:5A:FC:86:4E:D3,,infra,,2,0,?,?,?,False,40,,wpa2,US,TN,Parkway,,,37862
35.82214355,-83.57765198,Flock-864E5F,0,20220702-00000,2022-07-02T08:00:00.000Z,2022-07-02T13:00:00.000Z,2022-07-02T14:00:00.000Z,14:5A:FC:86:4E:5F,,infra,,2,0,?,?,?,False,149,,wpa2,US,TN,Parkway,,2097,37863
35.82806396,-83.76859283,Flock-3D1891,0,20220221-00000,2022-02-17T11:00:00.000Z,2022-02-21T04:00:00.000Z,2022-02-21T04:00:00.000Z,D8:F3:BC:3D:18:91,,infra,,2,0,?,?,?,False,11,,wpa2,US,TN,Jeffries Hollow Road,,1385,37865
35.90988922,-83.95492554,Flock-3D17D9,2,20211112-00000,2021-11-12T18:00:00.000Z,2021-11-27T03:00:00.000Z,2021-11-27T03:00:00.000Z,D8:F3:BC:3D:17:D9,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,Alcoa Highway,Knoxville,,37920
35.95152664,-83.93993378,Flock-91E8C9,0,20220724-00000,2022-07-24T12:00:00.000Z,2022-07-24T10:00:00.000Z,2022-07-24T10:00:00.000Z,14:5A:FC:91:E8:C9,,infra,,2,0,?,?,?,False,40,,wpa2,US,TN,University Commons Way,Knoxville,,37996
35.95185852,-86.81680298,Flock-BDB489,0,20220207-00000,2022-02-04T17:00:00.000Z,2022-02-07T15:00:00.000Z,2022-02-07T15:00:00.000Z,3C:91:80:BD:B4:89,,infra,,2,0,?,?,?,False,6,,wpa2,US,TN,South Springs Drive,Franklin,,37067
35.96388626,-86.69193268,Flock-BFDF73,0,20210518-00000,2021-05-17T18:00:00.000Z,2021-05-18T15:00:00.000Z,2022-06-27T19:00:00.000Z,3C:91:80:BF:DF:73,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,Sunset Road,,,37027
35.96389771,-86.69194794,Flock-3D250B,2,20210518-00000,2021-05-17T18:00:00.000Z,2022-04-09T20:00:00.000Z,2022-04-09T20:00:00.000Z,D8:F3:BC:3D:25:0B,,infra,,2,0,?,?,?,False,11,,wpa2,US,TN,Sunset Road,,,37027
35.9720726,-86.68730927,Flock-21D33B,1,20210519-00000,2021-05-19T16:00:00.000Z,2021-06-15T18:00:00.000Z,2022-06-27T19:00:00.000Z,80:30:49:21:D3:3B,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,Maxwell Lane,,1046,37135
36.00667191,-86.80523682,Flock-BDC329,4,20201117-00000,2020-11-17T18:00:00.000Z,2021-11-11T13:00:00.000Z,2021-11-11T13:00:00.000Z,3C:91:80:BD:C3:29,,infra,,2,0,?,?,?,False,1,,wpa2,US,TN,Franklin Road,,903,37027
36.11160278,-78.45851898,Flock-7EC58D,0,20211125-00000,2021-11-25T09:00:00.000Z,2021-11-25T06:00:00.000Z,2021-11-25T06:00:00.000Z,74:4C:A1:7E:C5:8D,,infra,,2,0,?,?,?,False,11,,wpa2,US,NC,Capital Boulevard,,,27525
36.12159729,-80.33590698,Flock-21D6EF,1,20210225-00000,2021-02-23T12:00:00.000Z,2021-02-25T05:00:00.000Z,2022-07-10T03:00:00.000Z,80:30:49:21:D6:EF,,infra,,2,0,?,?,?,False,6,,wpa2,US,NC,Robinhood Road,Winston-Salem,4300,27106
36.12548447,-115.1733017,Flock-736C71,0,20230905-00000,2023-09-06T01:00:00.000Z,2023-09-05T19:00:00.000Z,2023-09-05T19:00:00.000Z,9C:2F:9D:73:6C:71,,infra,,2,0,?,?,?,False,36,,wpa2,US,NV,Spring Mountain Road,,,89109-0766
36.25477219,-86.70153809,Flock-68E2F9,1,20211111-00000,2021-11-02T14:00:00.000Z,2021-11-13T08:00:00.000Z,2021-11-13T08:00:00.000Z,74:4C:A1:68:E2:F9,,infra,,2,0,?,?,?,False,6,,wpa2,US,TN,Neelys Bend Road,Nashville-Davidson,565,37115
36.30734253,-86.65549469,Flock-7AD23D,0,20220702-00000,2022-07-02T21:00:00.000Z,2022-07-02T22:00:00.000Z,2022-07-02T22:00:00.000Z,14:5A:FC:7A:D2:3D,,infra,,2,0,?,?,?,False,40,,wpa2,US,TN,West Main Street,,,37075
36.32293701,-88.32422638,Flock-5E3C2D,0,20231031-00000,2023-10-31T14:00:00.000Z,2023-10-31T17:00:00.000Z,2023-10-31T17:00:00.000Z,F4:6A:DD:5E:3C:2D,,infra,,2,0,?,?,?,False,149,,wpa2,US,TN,South Market Street,,,38242
36.73606873,-119.78707123,Flock-5ECF0C,0,20240527-00000,2024-05-28T01:00:00.000Z,2024-05-27T20:00:00.000Z,2024-05-27T20:00:00.000Z,62:DD:4C:98:32:72,,infra,,2,0,?,?,?,False,11,0,wpa2,US,CA,M Street,Fresno,,93721
37.21211243,-93.25511932,Flock-91EE17,0,20220706-00000,2022-07-05T16:00:00.000Z,2022-07-06T09:00:00.000Z,2022-07-06T09:00:00.000Z,14:5A:FC:91:EE:17,,infra,,2,0,?,?,?,False,36,,wpa2,US,MO,East Chestnut Expressway,Springfield,,65897
37.2151413,-93.31060791,Flock-7ACEB5,0,20220707-00000,2022-07-07T15:00:00.000Z,2022-07-07T13:00:00.000Z,2022-07-07T13:00:00.000Z,14:5A:FC:7A:CE:B5,,infra,,2,0,?,?,?,False,40,,wpa2,US,MO,West Chestnut Street,Springfield,1532,65802
37.21567535,-93.31186676,Flock-7EB589,0,20220610-00000,2022-06-10T16:00:00.000Z,2022-06-10T15:00:00.000Z,2022-06-10T16:00:00.000Z,74:4C:A1:7E:B5:89,,infra,,2,0,?,?,?,False,36,,wpa2,US,MO,North Kansas Expressway,Springfield,626,65802
37.24091339,-93.311203,Flock-8C761B,0,20220709-00000,2022-07-09T11:00:00.000Z,2022-07-09T10:00:00.000Z,2022-07-09T10:00:00.000Z,74:4C:A1:8C:76:1B,,infra,,2,0,?,?,?,False,36,,wpa2,US,MO,North Kansas Expressway,Springfield,,65802-4230
37.28210831,-122.00217438,Flock-E05457,0,20210123-00000,2021-01-23T15:00:00.000Z,2021-01-23T17:00:00.000Z,2022-06-26T11:00:00.000Z,80:30:49:E0:54:57,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Saratoga Avenue,,12768,95070
37.28506851,-76.68552399,Flock-7DC3CD,0,20211203-00000,2021-11-30T08:00:00.000Z,2021-12-03T17:00:00.000Z,2021-12-03T18:00:00.000Z,D8:F3:BC:7D:C3:CD,,infra,,2,0,?,?,?,False,1,,wpa2,US,VA,Merrimac Trail,,942,23185
37.28594971,-121.99829865,Flock-7F6B7D,0,20210408-00000,2021-04-08T15:00:00.000Z,2021-04-08T16:00:00.000Z,2022-06-26T11:00:00.000Z,70:C9:4E:7F:6B:7D,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,Saratoga Avenue,,,95070
37.28659058,-76.72052002,Flock-7DC243,1,20220115-00000,2022-01-16T03:00:00.000Z,2022-01-15T12:00:00.000Z,2022-01-15T12:00:00.000Z,D8:F3:BC:7D:C2:43,,infra,,W,0,?,?,?,False,1,,wpa,US,VA,Bypass Road,,,23186
37.33190536,-121.91234589,Flock-84112B,0,20240212-00000,2024-02-12T23:00:00.000Z,2024-02-12T23:00:00.000Z,2024-02-12T23:00:00.000Z,9C:2F:9D:84:11:2B,,infra,,2,0,?,?,?,False,36,0,wpa2,US,CA,The Alameda,San Jose,,95126
37.34286118,-121.8462677,Flock-32009D,0,20240419-00000,2024-04-19T04:00:00.000Z,2024-04-19T02:00:00.000Z,2024-04-19T02:00:00.000Z,F4:6A:DD:32:00:9D,,infra,,2,0,?,?,?,False,48,0,wpa2,US,CA,South King Road,San Jose,,95116
37.34776306,-108.4937439,Flock-6778DD,0,20220415-00000,2022-04-11T11:00:00.000Z,2022-04-15T12:00:00.000Z,2022-04-15T12:00:00.000Z,94:08:53:67:78:DD,,infra,,2,0,?,?,?,False,1,,wpa2,US,CO,East Mancos Road,,0,
37.34777069,-108.49098206,Flock-676969,0,20220415-00000,2022-04-11T11:00:00.000Z,2022-04-15T12:00:00.000Z,2022-04-15T12:00:00.000Z,94:08:53:67:69:69,,infra,,2,0,?,?,?,False,1,,wpa2,US,CO,East Mancos Road,,30658,81321
37.35266876,-121.86829376,Flock-B788B5,0,20240126-00000,2024-01-26T21:00:00.000Z,2024-01-26T22:00:00.000Z,2024-01-27T00:00:00.000Z,E0:0A:F6:B7:88:B5,,infra,,2,0,?,?,?,False,40,,wpa2,US,CA,East Julian Street,San Jose,1310,95116
37.37117386,-121.84138489,Flock-54F4E3,0,20231020-00000,2023-10-19T20:00:00.000Z,2023-10-20T15:00:00.000Z,2023-10-20T17:00:00.000Z,D0:39:57:54:F4:E3,,infra,,2,0,?,?,?,False,153,,wpa2,US,CA,McKee Road,San Jose,2768,95127
37.41788864,-121.91572571,Flock-BADB9B,0,20210713-00000,2021-07-09T18:00:00.000Z,2021-07-13T16:00:00.000Z,2022-06-26T23:00:00.000Z,3C:91:80:BA:DB:9B,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Barber Lane,Milpitas,800,95035
37.43032074,-122.15187836,Flock-4FE173,0,20230901-00000,2023-09-01T17:00:00.000Z,2023-09-01T15:00:00.000Z,2023-09-01T15:00:00.000Z,9C:2F:9D:4F:E1:73,,infra,,2,0,?,?,?,False,157,,wpa2,US,CA,West El Camino Real,Palo Alto,,94304-1050
37.45969772,-121.91223907,Flock-E054CD,0,20210516-00000,2021-05-15T13:00:00.000Z,2021-05-16T09:00:00.000Z,2022-06-26T23:00:00.000Z,80:30:49:E0:54:CD,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,North Milpitas Boulevard,Milpitas,2018,95035
37.58472443,-122.32876587,Flock-86546F,0,20220724-00000,2022-07-24T17:00:00.000Z,2022-07-24T21:00:00.000Z,2022-07-24T21:00:00.000Z,14:5A:FC:86:54:6F,,infra,,2,0,?,?,?,False,44,,wpa2,US,CA,Bayshore Freeway,,,94101
37.58961868,-122.41200256,Flock-6FE865,0,20220521-00000,2022-05-21T16:00:00.000Z,2022-05-21T18:00:00.000Z,2022-05-22T01:00:00.000Z,14:5A:FC:6F:E8:65,,infra,,2,0,?,?,?,False,36,,wpa2,US,CA,Hillcrest Boulevard,,,94030
37.61100006,-77.44710541,Flock-7ACFA9,0,20220423-00000,2022-04-23T10:00:00.000Z,2022-04-23T16:00:00.000Z,2022-04-23T17:00:00.000Z,14:5A:FC:7A:CF:A9,,infra,,2,0,?,?,?,False,1,,wpa2,US,VA,Chamberlayne Road,,,23227
37.63235092,-121.80188751,Flock-E05B5F,0,20220203-00000,2022-02-03T14:00:00.000Z,2022-02-03T15:00:00.000Z,2022-02-03T15:00:00.000Z,80:30:49:E0:5B:5F,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Vallecitos Road,,,
37.63693619,-121.89089966,Flock-A4F1F5,0,20211205-00000,2021-12-05T16:00:00.000Z,2021-12-05T17:00:00.000Z,2021-12-05T17:00:00.000Z,3C:91:80:A4:F1:F5,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,Foothill Road,,,94586
37.63971329,-122.42318726,Flock-281683,0,20210602-00000,2021-06-02T18:00:00.000Z,2021-06-02T19:00:00.000Z,2022-06-18T06:00:00.000Z,94:08:53:28:16:83,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,El Camino Real,,,94066-2350
37.67212677,-97.28050995,Flock-21CEEF,1,20210611-00000,2021-06-11T10:00:00.000Z,2021-07-07T10:00:00.000Z,2022-07-17T13:00:00.000Z,80:30:49:21:CE:EF,,infra,,2,0,?,?,?,False,11,,wpa2,US,KS,South Oliver Street,Wichita,,67218
37.67311096,-97.41130066,Flock-E05A8B,0,20210409-00000,2021-04-08T11:00:00.000Z,2021-04-09T08:00:00.000Z,2022-07-16T13:00:00.000Z,80:30:49:E0:5A:8B,,infra,,2,0,?,?,?,False,1,,wpa2,US,KS,Vietnam Veterans Memorial Highway,Wichita,,67209
37.67972565,-122.4706192,Flock-7EC273,0,20211022-00000,2021-10-22T12:00:00.000Z,2021-10-22T14:00:00.000Z,2021-10-22T14:00:00.000Z,74:4C:A1:7E:C2:73,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,Junipero Serra Boulevard,,4103,94014
37.69361496,-97.28062439,Flock-21D74D,0,20210702-00000,2021-07-02T15:00:00.000Z,2021-07-02T17:00:00.000Z,2022-07-17T13:00:00.000Z,80:30:49:21:D7:4D,,infra,,2,0,?,?,?,False,11,,wpa2,US,KS,North Oliver Street,Wichita,,67208
37.70186615,-121.7562027,Flock-809939,1,20200901-00000,2020-09-01T10:00:00.000Z,2020-09-02T17:00:00.000Z,2022-06-27T12:00:00.000Z,E4:AA:EA:80:99:39,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Las Positas Road,,,94551
37.70950699,-97.32010651,Flock-21D3A1,0,20210602-00000,2021-06-02T10:00:00.000Z,2021-06-02T09:00:00.000Z,2022-07-17T08:00:00.000Z,80:30:49:21:D3:A1,,infra,,2,0,?,?,?,False,1,,wpa2,US,KS,I 135;US 81;KS 15,Wichita,,67214
37.7171402,-121.70471191,Flock-565003,0,20210510-00000,2021-05-10T17:00:00.000Z,2021-05-10T18:00:00.000Z,2022-06-27T14:00:00.000Z,E4:AA:EA:56:50:03,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Arthur H. Breed Junior Freeway,,,
37.7269516,-121.72425079,Flock-7F68E5,0,20210210-00000,2021-02-10T11:00:00.000Z,2021-02-10T12:00:00.000Z,2022-06-27T13:00:00.000Z,70:C9:4E:7F:68:E5,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Dalton Avenue,,,
37.77936172,-121.96916199,Flock-127B61,0,20210321-00000,2021-03-21T13:00:00.000Z,2021-03-21T14:00:00.000Z,2022-06-26T15:00:00.000Z,80:30:49:12:7B:61,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Crow Canyon Road,,,94583
37.78774643,-122.45938873,Flock-BDB597,0,20200901-00000,2020-09-01T14:00:00.000Z,2020-09-01T19:00:00.000Z,2022-06-17T10:00:00.000Z,3C:91:80:BD:B5:97,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Arguello Boulevard,San Francisco,,94118-1316
37.78821945,-122.45942688,Flock-BDB34F,0,20200901-00000,2020-09-01T14:00:00.000Z,2020-09-01T19:00:00.000Z,2022-06-17T10:00:00.000Z,3C:91:80:BD:B3:4F,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Arguello Boulevard,San Francisco,112,94118-1316
37.80702972,-122.47414398,Flock-809BF5,4,20200921-00000,2020-09-21T15:00:00.000Z,2021-04-01T17:00:00.000Z,2022-06-17T04:00:00.000Z,E4:AA:EA:80:9B:F5,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Vista Access Road,San Francisco,,94129
37.83372498,-122.48260498,Flock-BDB5FF,2,20200901-00000,2020-09-01T16:00:00.000Z,2021-05-30T17:00:00.000Z,2022-06-17T01:00:00.000Z,3C:91:80:BD:B5:FF,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Redwood Highway,,,94965
37.83473587,-122.48377228,Flock-A4EF19,0,20201021-00000,2020-10-20T15:00:00.000Z,2020-10-21T02:00:00.000Z,2022-06-17T01:00:00.000Z,3C:91:80:A4:EF:19,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Redwood Highway,,,94965
37.86830902,-90.6444397,Flock-5CB61F,0,20230707-00000,2023-07-07T13:00:00.000Z,2023-07-07T12:00:00.000Z,2023-07-07T12:00:00.000Z,9C:2F:9D:5C:B6:1F,,infra,,2,0,?,?,?,False,149,,wpa2,US,MO,MO 8,,,63648
38.064888,-85.5641861,Flock-86505D,0,20220424-00000,2022-04-24T12:00:00.000Z,2022-04-24T09:00:00.000Z,2022-04-24T09:00:00.000Z,14:5A:FC:86:50:5D,,infra,,2,0,?,?,?,False,11,,wpa2,US,KY,,,,40047
38.08436584,-122.11309814,Flock-7DBE39,0,20210903-00000,2021-09-03T17:00:00.000Z,2021-09-03T18:00:00.000Z,2021-09-03T18:00:00.000Z,D8:F3:BC:7D:BE:39,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Luther E Gibson Freeway,,,94510
38.09819794,-122.25498962,Flock-218E4E,0,20220101-00000,2021-12-28T14:00:00.000Z,2022-01-01T16:00:00.000Z,2022-01-01T16:00:00.000Z,08:3A:88:21:8E:4E,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Sonoma Boulevard,Vallejo,,94590
38.13722229,-122.21338654,FLOCK-217DD4,2,20230104-00000,2023-01-04T08:00:00.000Z,2023-01-26T19:00:00.000Z,2023-01-26T19:00:00.000Z,08:3A:88:21:7D:D4,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Admiral Callaghan Lane,Vallejo,,94591
38.14232635,-122.22745514,Flock-898713,0,20220517-00000,2022-05-17T21:00:00.000Z,2022-05-17T21:00:00.000Z,2022-05-17T21:00:00.000Z,74:4C:A1:89:87:13,,infra,,2,0,?,?,?,False,44,,wpa2,US,CA,Sage Street,Vallejo,118,94589
38.14399719,-122.2491684,Flock-896469,0,20220407-00000,2022-04-07T21:00:00.000Z,2022-04-08T01:00:00.000Z,2022-04-08T01:00:00.000Z,74:4C:A1:89:64:69,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Violet Drive,Vallejo,,94589
38.15504837,-122.23832703,Flock-7EB03F,0,20211219-00000,2021-12-19T18:00:00.000Z,2021-12-19T18:00:00.000Z,2021-12-19T18:00:00.000Z,74:4C:A1:7E:B0:3F,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,Flosden Road,,2592,94589
38.16077042,-121.68820953,Flock-7EAE53,0,20220307-00000,2022-03-07T17:00:00.000Z,2022-03-07T22:00:00.000Z,2022-03-07T22:00:00.000Z,74:4C:A1:7E:AE:53,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,CA 12,,,94571
38.23978043,-122.0848465,Flock-7DD4FB,0,20210905-00000,2021-09-05T18:00:00.000Z,2021-09-05T19:00:00.000Z,2021-09-05T19:00:00.000Z,D8:F3:BC:7D:D4:FB,,infra,,2,0,?,?,?,False,6,,wpa2,US,CA,CA 12,Fairfield,,94534
38.25345993,-122.06671143,Flock-7DC72B,4,20210701-00000,2021-07-01T17:00:00.000Z,2021-09-20T01:00:00.000Z,2021-09-20T01:00:00.000Z,D8:F3:BC:7D:C7:2B,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,I 80,Fairfield,,94533
38.25408173,-86.31150818,Flock-676711,0,20220722-00000,2022-07-22T15:00:00.000Z,2022-07-22T15:00:00.000Z,2022-07-31T09:00:00.000Z,94:08:53:67:67:11,,infra,,W,0,?,?,?,False,48,,wpa,US,IN,I 64,,,
38.27960587,-85.74651337,Flock-675CFB,0,20220528-00000,2022-05-28T22:00:00.000Z,2022-05-28T21:00:00.000Z,2022-05-28T21:00:00.000Z,94:08:53:67:5C:FB,,infra,,2,0,?,?,?,False,40,,wpa2,US,IN,Spring Street,,1057,47130
38.29343796,-122.0328064,Flock-7DC155,0,20211102-00000,2021-09-07T14:00:00.000Z,2021-11-02T03:00:00.000Z,2021-11-02T03:00:00.000Z,D8:F3:BC:7D:C1:55,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,North Texas Street,Fairfield,,94533
38.40712357,-121.38751984,Flock-8961A5,0,20220401-00000,2022-04-01T09:00:00.000Z,2022-04-01T13:00:00.000Z,2022-04-01T14:00:00.000Z,74:4C:A1:89:61:A5,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,South Sacramento Freeway,Elk Grove,,95757
38.40983963,-121.43051147,Flock-127A73,0,20210601-00000,2021-06-01T13:00:00.000Z,2021-06-01T15:00:00.000Z,2022-06-27T23:00:00.000Z,80:30:49:12:7A:73,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Foulks Ranch Drive,Elk Grove,9585,95758
38.43758392,-121.4081192,Flock-895845,0,20220504-00000,2022-04-28T13:00:00.000Z,2022-05-04T17:00:00.000Z,2022-05-04T17:00:00.000Z,74:4C:A1:89:58:45,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Sheldon Road,Elk Grove,7956,95758
38.44506454,-90.37870026,Flock-86BF33,0,20240412-00000,2024-04-12T16:00:00.000Z,2024-04-12T15:00:00.000Z,2024-04-12T16:00:00.000Z,D0:39:57:86:BF:33,,infra,,2,0,?,?,?,False,157,0,wpa2,US,MO,I 55,,,63010
38.59304047,-90.52446747,Flock-68DB43,0,20211004-00000,2021-10-04T15:00:00.000Z,2021-10-04T14:00:00.000Z,2021-10-04T14:00:00.000Z,74:4C:A1:68:DB:43,,infra,,2,0,?,?,?,False,6,,wpa2,US,MO,Manchester Road,,14540,63011
38.66379166,-121.27800751,Flock-E05B63,4,20210525-00000,2021-05-24T20:00:00.000Z,2021-06-29T15:00:00.000Z,2022-06-28T06:00:00.000Z,80:30:49:E0:5B:63,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Madison Avenue,,7756,95628
38.66395569,-121.27766418,Flock-2815E9,0,20210911-00000,2021-09-11T01:00:00.000Z,2021-09-11T01:00:00.000Z,2021-09-11T01:00:00.000Z,94:08:53:28:15:E9,,infra,,2,0,?,?,?,False,1,,wpa2,US,CA,Madison Avenue,,7767,95610
38.66924667,-90.58465576,Flock-89881D,0,20220130-00000,2022-01-29T22:00:00.000Z,2022-01-30T00:00:00.000Z,2022-01-30T00:00:00.000Z,74:4C:A1:89:88:1D,,infra,,2,0,?,?,?,False,1,,wpa2,US,MO,Avenue of the Saints,,,63005
38.727314,-121.27200317,Flock-68DABF,0,20220116-00000,2022-01-14T17:00:00.000Z,2022-01-16T21:00:00.000Z,2022-01-16T21:00:00.000Z,74:4C:A1:68:DA:BF,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Sunrise Avenue,Roseville,1089,95661
38.73049927,-76.99234772,Flock-3D2693,0,20210723-00000,2021-07-23T14:00:00.000Z,2021-07-23T11:00:00.000Z,2022-07-20T14:00:00.000Z,D8:F3:BC:3D:26:93,,infra,,2,0,?,?,?,False,11,,wpa2,US,MD,Livingston Road,,11711,20744
38.73089218,-76.99240875,Flock-3D2005,0,20210723-00000,2021-07-23T14:00:00.000Z,2021-07-23T11:00:00.000Z,2022-07-20T14:00:00.000Z,D8:F3:BC:3D:20:05,,infra,,2,0,?,?,?,False,6,,wpa2,US,MD,Livingston Road,,,20744
38.74400711,-121.26766205,Flock-7EC101,0,20211219-00000,2021-12-19T16:00:00.000Z,2021-12-19T19:00:00.000Z,2021-12-19T19:00:00.000Z,74:4C:A1:7E:C1:01,,infra,,2,0,?,?,?,False,11,,wpa2,US,CA,Douglas Boulevard,Roseville,,95661
38.74752808,-90.42198181,Flock-3D1E23,0,20211112-00000,2021-11-12T09:00:00.000Z,2021-11-12T07:00:00.000Z,2021-11-12T07:00:00.000Z,D8:F3:BC:3D:1E:23,,infra,,2,0,?,?,?,False,6,,wpa2,US,MO,Saint Charles Rock Road,,11969,63044
38.75268555,-90.74419403,Flock-7F63E7,3,20200907-00000,2020-09-07T18:00:00.000Z,2020-12-06T13:00:00.000Z,2022-08-09T18:00:00.000Z,70:C9:4E:7F:63:E7,,infra,,2,0,?,?,?,False,1,,wpa2,US,MO,Winghaven Boulevard,O’Fallon,,63368
38.75905991,-90.74347687,Flock-3D19B9,0,20210508-00000,2021-05-08T11:00:00.000Z,2021-05-08T14:00:00.000Z,2022-08-09T18:00:00.000Z,D8:F3:BC:3D:19:B9,,infra,,2,0,?,?,?,False,6,,wpa2,US,MO,Wake Forest Place,O’Fallon,129,63368
38.76594925,-90.74459076,Flock-BDB569,1,20200823-00000,2020-08-23T18:00:00.000Z,2020-09-02T11:00:00.000Z,2022-08-09T18:00:00.000Z,3C:91:80:BD:B5:69,,infra,,2,0,?,?,?,False,1,,wpa2,US,MO,Town Square Avenue,,,63367
38.76697922,-90.49033356,Flock-7EBAB7,0,20220703-00000,2022-07-03T11:00:00.000Z,2022-07-03T09:00:00.000Z,2022-07-03T09:00:00.000Z,74:4C:A1:7E:BA:B7,,infra,,2,0,?,?,?,False,44,,wpa2,US,MO,I 70,,,63045
38.769207,-90.74074554,Flock-7DD08D,4,20210602-00000,2021-06-02T17:00:00.000Z,2021-11-24T15:00:00.000Z,2021-11-24T15:00:00.000Z,D8:F3:BC:7D:D0:8D,,infra,,2,0,?,?,?,False,6,,wpa2,US,MO,Route N,,,63367
38.77187347,-90.2987442,Flock-28133F,2,20210225-00000,2021-02-15T14:00:00.000Z,2021-07-15T12:00:00.000Z,2022-08-10T19:00:00.000Z,94:08:53:28:13:3F,,infra,,2,0,?,?,?,False,6,,wpa2,US,MO,I 270,,,63031-8117
38.7818222,-90.27844238,Flock-5A4DB7,0,20220723-00000,2022-07-22T20:00:00.000Z,2022-07-23T11:00:00.000Z,2022-07-23T12:00:00.000Z,9C:2F:9D:5A:4D:B7,,infra,,2,0,?,?,?,False,161,,wpa2,US,MO,New Halls Ferry Road,,11970,63033
38.79299164,-90.34313202,Flock-7ACDE7,0,20220517-00000,2022-05-17T09:00:00.000Z,2022-05-17T23:00:00.000Z,2022-05-26T04:00:00.000Z,14:5A:FC:7A:CD:E7,,infra,,2,0,?,?,?,False,36,,wpa2,US,MO,North Lindbergh Boulevard,,8411,63031
38.79711914,-77.06659698,Flock-6F4225,2,20240229-00000,2024-02-29T15:00:00.000Z,2024-05-27T14:00:00.000Z,2024-05-27T14:00:00.000Z,9C:2F:9D:6F:42:25,,tods,,2,0,?,?,?,False,8,0,wpa2,US,VA,Capital Beltway (Express),,,22303
38.79726791,-90.73600769,Flock-3D0FFF,0,20210424-00000,2021-04-24T16:00:00.000Z,2021-04-24T14:00:00.000Z,2022-08-09T18:00:00.000Z,D8:F3:BC:3D:0F:FF,,infra,,2,0,?,?,?,False,1,,wpa2,US,MO,Bryan Road,O’Fallon,1019,63366
38.79782867,-90.73558807,Flock-3D15C9,0,20210918-00000,2021-09-18T09:00:00.000Z,2021-09-18T12:00:00.000Z,2021-09-18T12:00:00.000Z,D8:F3:BC:3D:15:C9,,infra,,2,0,?,?,?,False,1,,wpa2,US,MO,Bryan Road,O’Fallon,,63366
38.79850769,-90.73563385,Flock-21D1B1,1,20210729-00000,2021-07-29T09:00:00.000Z,2021-08-16T11:00:00.000Z,2022-08-09T18:00:00.000Z,80:30:49:21:D1:B1,,infra,,2,0,?,?,?,False,11,,wpa2,US,MO,Bryan Road,O’Fallon,,63366
38.80192947,-90.70020294,Flock-3D0D71,0,20210724-00000,2021-07-24T15:00:00.000Z,2021-07-24T14:00:00.000Z,2022-08-09T19:00:00.000Z,D8:F3:BC:3D:0D:71,,infra,,2,0,?,?,?,False,11,,wpa2,US,MO,Highway K,O’Fallon,,63368
38.80238342,-90.73350525,Flock-3D2721,0,20210906-00000,2021-09-06T10:00:00.000Z,2021-09-06T16:00:00.000Z,2021-09-06T16:00:00.000Z,D8:F3:BC:3D:27:21,,infra,,2,0,?,?,?,False,1,,wpa2,US,MO,Bryan Road,O’Fallon,,63366
38.80971909,-90.29919434,Flock-21D257,0,20220610-00000,2022-06-09T20:00:00.000Z,2022-06-10T17:00:00.000Z,2022-06-10T17:00:00.000Z,80:30:49:21:D2:57,,infra,,2,0,?,?,?,False,40,,wpa2,US,MO,New Halls Ferry Road,,14150,63033
38.81459808,-94.53057861,Flock-864C7B,0,20220503-00000,2022-05-03T17:00:00.000Z,2022-05-03T23:00:00.000Z,2022-05-03T23:00:00.000Z,14:5A:FC:86:4C:7B,,infra,,2,0,?,?,?,False,6,,wpa2,US,MO,East North Avenue,Belton,224,64012
38.96803665,-90.42292786,Flock-E05A65,0,20210610-00000,2021-06-05T15:00:00.000Z,2021-06-10T21:00:00.000Z,2022-08-10T09:00:00.000Z,80:30:49:E0:5A:65,,infra,,2,0,?,?,?,False,11,,wpa2,US,IL,River Road,,,62307
39.02672958,-119.74539948,Flock-ABCDEF,0,20221214-00000,2022-12-14T12:00:00.000Z,2022-12-14T23:00:00.000Z,2022-12-14T23:00:00.000Z,C0:C9:E3:50:30:1E,,infra,,2,0,?,?,?,False,8,,wpa2,US,NV,Johnson Lane,,,
39.19875336,-86.03688049,Flock-68E10D,0,20211001-00000,2021-10-01T11:00:00.000Z,2021-10-01T09:00:00.000Z,2021-10-01T09:00:00.000Z,74:4C:A1:68:E1:0D,,infra,,2,0,?,?,?,False,11,,wpa2,US,IN,Jonathan Moore Pike,,10647,47201
39.22386551,-85.85414886,Flock-893013,0,20220205-00000,2022-02-05T18:00:00.000Z,2022-02-05T16:00:00.000Z,2022-02-05T16:00:00.000Z,74:4C:A1:89:30:13,,infra,,2,0,?,?,?,False,1,,wpa2,US,IN,25th Street,,6000,47203
39.36623001,-104.86427307,Flock-7ACC39,1,20220524-00000,2022-05-23T16:00:00.000Z,2022-05-30T04:00:00.000Z,2022-05-30T04:00:00.000Z,14:5A:FC:7A:CC:39,,infra,,2,0,?,?,?,False,153,,wpa2,US,CO,Plum Creek Parkway,,,80184
39.37729263,-104.85876465,Flock-8646CD,0,20220323-00000,2022-03-23T07:00:00.000Z,2022-03-23T19:00:00.000Z,2022-03-23T20:00:00.000Z,14:5A:FC:86:46:CD,,infra,,2,0,?,?,?,False,1,,wpa2,US,CO,Perry Street,,799,80104
39.37958527,-104.85987091,Flock-96992B,0,20220723-00000,2022-07-21T10:00:00.000Z,2022-07-23T06:00:00.000Z,2022-07-23T06:00:00.000Z,14:5A:FC:96:99:2B,,infra,,2,0,?,?,?,False,161,,wpa2,US,CO,Wilcox Street,,,80104
39.38025665,-104.86169434,Flock-7DCCED,0,20210911-00000,2021-09-09T17:00:00.000Z,2021-09-11T09:00:00.000Z,2021-09-11T09:00:00.000Z,D8:F3:BC:7D:CC:ED,,infra,,2,0,?,?,?,False,11,,wpa2,US,CO,East Wolfensberger Road,,,80104
39.3803215,-104.86270142,Flock-8647F5,0,20220705-00000,2022-07-05T06:00:00.000Z,2022-07-05T16:00:00.000Z,2022-07-13T16:00:00.000Z,14:5A:FC:86:47:F5,,infra,,2,0,?,?,?,False,153,,wpa2,US,CO,East Wolfensberger Road,,,80104
39.3808403,-104.85849762,Flock-7EB905,0,20220211-00000,2022-02-10T14:00:00.000Z,2022-02-11T17:00:00.000Z,2022-02-11T17:00:00.000Z,74:4C:A1:7E:B9:05,,infra,,2,0,?,?,?,False,1,,wpa2,US,CO,Front Street,,,80104
39.39794922,-104.85969543,Flock-896061,0,20220302-00000,2022-02-25T07:00:00.000Z,2022-03-02T18:00:00.000Z,2022-03-02T19:00:00.000Z,74:4C:A1:89:60:61,,infra,,2,0,?,?,?,False,11,,wpa2,US,CO,Front Street,,2909,80104
39.4009552,-104.85884094,Flock-8989A9,1,20220126-00000,2022-01-25T18:00:00.000Z,2022-02-23T18:00:00.000Z,2022-02-23T18:00:00.000Z,74:4C:A1:89:89:A9,,infra,,2,0,?,?,?,False,11,,wpa2,US,CO,Black Feather Trail,,499,80104
39.4095459,-104.84687042,Flock-BDB571,0,20210618-00000,2021-06-18T18:00:00.000Z,2021-06-18T18:00:00.000Z,2022-07-11T06:00:00.000Z,3C:91:80:BD:B5:71,,infra,,2,0,?,?,?,False,6,,wpa2,US,CO,Founders Parkway,,,80108
39.40954971,-104.84700012,Flock-7EB7BF,0,20220209-00000,2022-02-09T14:00:00.000Z,2022-02-09T19:00:00.000Z,2022-02-09T19:00:00.000Z,74:4C:A1:7E:B7:BF,,infra,,2,0,?,?,?,False,6,,wpa2,US,CO,Founders Parkway,,,80108
39.41288376,-104.86391449,Flock-896147,1,20220302-00000,2022-03-01T13:00:00.000Z,2022-04-23T19:00:00.000Z,2022-04-23T19:00:00.000Z,74:4C:A1:89:61:47,,infra,,2,0,?,?,?,False,1,,wpa2,US,CO,Founders Parkway,,,80108
39.41643143,-104.83970642,Flock-7EBA13,0,20220713-00000,2022-07-12T18:00:00.000Z,2022-07-12T18:00:00.000Z,2022-07-13T16:00:00.000Z,74:4C:A1:7E:BA:13,,infra,,2,0,?,?,?,False,48,,wpa2,US,CO,Crowfoot Valley Road,,,80108
39.41779709,-104.8371582,Flock-7EAFBF,2,20211208-00000,2021-12-08T17:00:00.000Z,2022-03-02T18:00:00.000Z,2022-03-02T19:00:00.000Z,74:4C:A1:7E:AF:BF,,infra,,2,0,?,?,?,False,1,,wpa2,US,CO,Crowfoot Valley Road,,,80108
39.41836548,-104.83627319,Flock-7DC52D,2,20210830-00000,2021-08-29T11:00:00.000Z,2021-09-11T09:00:00.000Z,2021-09-11T09:00:00.000Z,D8:F3:BC:7D:C5:2D,,infra,,2,0,?,?,?,False,1,,wpa2,US,CO,Crowfoot Valley Road,,,80108
39.42287827,-104.87765503,Flock-7EBEF7,0,20211007-00000,2021-10-04T17:00:00.000Z,2021-10-07T04:00:00.000Z,2021-10-07T04:00:00.000Z,74:4C:A1:7E:BE:F7,,infra,,2,0,?,?,?,False,6,,wpa2,US,CO,,,,80108
39.42309952,-104.87903595,Flock-7DD13F,0,20210511-00000,2021-05-11T12:00:00.000Z,2021-05-11T19:00:00.000Z,2022-07-11T04:00:00.000Z,D8:F3:BC:7D:D1:3F,,infra,,2,0,?,?,?,False,1,,wpa2,US,CO,Promenade Parkway,,,80108
39.42372131,-104.87914276,Flock-7DD045,0,20220509-00000,2022-05-08T18:00:00.000Z,2022-05-09T04:00:00.000Z,2022-05-09T04:00:00.000Z,D8:F3:BC:7D:D0:45,,infra,,2,0,?,?,?,False,11,,wpa2,US,CO,Castle Rock Parkway,,,80108
39.4244194,-104.87792969,Flock-7DD2B9,0,20211007-00000,2021-10-04T16:00:00.000Z,2021-10-07T04:00:00.000Z,2021-10-07T04:00:00.000Z,D8:F3:BC:7D:D2:B9,,infra,,2,0,?,?,?,False,11,,wpa2,US,CO,Castle Rock Parkway,,,80108
39.4635582,-104.78929901,Flock-865461,1,20220612-00000,2022-06-10T18:00:00.000Z,2022-07-05T16:00:00.000Z,2022-07-05T16:00:00.000Z,14:5A:FC:86:54:61,,infra,,2,0,?,?,?,False,48,,wpa2,US,CO,Crowfoot Valley Road,,,80134
39.57798004,-104.71307373,Flock-A4E9F7,2,20200927-00000,2020-09-25T10:00:00.000Z,2020-11-28T12:00:00.000Z,2022-07-11T14:00:00.000Z,3C:91:80:A4:E9:F7,,infra,,2,0,?,?,?,False,6,,wpa2,US,CO,South Aurora Parkway,Aurora,23610,80016
39.62915039,-84.21808624,Flock-91E659,0,20220713-00000,2001-12-31T19:00:00.000Z,2001-12-31T19:00:00.000Z,2022-07-13T22:00:00.000Z,14:5A:FC:91:E6:59,,infra,,2,0,?,?,?,False,44,,wpa2,US,OH,Chuffstan Drive,,,45459-4011
39.63214874,-106.52243042,Flock-370C95,0,20230816-00000,2023-08-16T18:00:00.000Z,2023-08-16T13:00:00.000Z,2023-08-16T14:00:00.000Z,F4:6A:DD:37:0C:95,,infra,,2,0,?,?,?,False,161,,wpa2,US,CO,Avon Road,,,81620
39.63577652,-104.95980835,Flock-BFF2F9,0,20201020-00000,2020-10-20T15:00:00.000Z,2020-10-20T16:00:00.000Z,2022-07-11T00:00:00.000Z,3C:91:80:BF:F2:F9,,infra,,2,0,?,?,?,False,11,,wpa2,US,CO,South University Boulevard,,4545,80113
39.63778687,-84.22492981,Flock-3D2753,0,20210504-00000,2021-05-04T07:00:00.000Z,2021-05-04T06:00:00.000Z,2022-07-02T20:00:00.000Z,D8:F3:BC:3D:27:53,,infra,,2,0,?,?,?,False,11,,wpa2,US,OH,Miamisburg Centerville Road,,,45449
39.63980103,-84.2250061,Flock-86540B,0,20220406-00000,2022-04-03T09:00:00.000Z,2022-04-06T04:00:00.000Z,2022-04-06T04:00:00.000Z,14:5A:FC:86:54:0B,,infra,,2,0,?,?,?,False,1,,wpa2,US,OH,Mall Park Drive,,3099,45459
39.64076614,-84.22455597,Flock-3D0D31,0,20210428-00000,2021-04-28T11:00:00.000Z,2021-04-28T09:00:00.000Z,2022-07-02T20:00:00.000Z,D8:F3:BC:3D:0D:31,,infra,,2,0,?,?,?,False,1,,wpa2,US,OH,North Springboro Pike,,,45449
39.64445877,-84.23175049,Flock-6FD549,0,20220713-00000,2001-12-31T19:00:00.000Z,2001-12-31T19:00:00.000Z,2022-07-13T22:00:00.000Z,14:5A:FC:6F:D5:49,,infra,,2,0,?,?,?,False,48,,wpa2,US,OH,I 75,,,45449
39.64467621,-84.15712738,Flock-8934FF,0,20220308-00000,2022-02-15T21:00:00.000Z,2022-03-08T20:00:00.000Z,2022-03-08T20:00:00.000Z,74:4C:A1:89:34:FF,,infra,,2,0,?,?,?,False,6,,wpa2,US,OH,Far Hills Avenue,,,45459
39.6499176,-84.1105957,Flock-8C7A3B,0,20220419-00000,2022-04-19T20:00:00.000Z,2022-04-19T19:00:00.000Z,2022-04-19T19:00:00.000Z,74:4C:A1:8C:7A:3B,,infra,,2,0,?,?,?,False,11,,wpa2,US,OH,Clyo Road,,,45458
39.68616104,-111.83351135,Flock-BAEFA7,0,20200810-00000,2020-08-09T20:00:00.000Z,2020-08-10T18:00:00.000Z,2022-07-08T03:00:00.000Z,3C:91:80:BA:EF:A7,,infra,,2,0,?,?,?,False,6,,wpa2,US,UT,I 15,,,84648
39.6989212,-86.14983368,Flock-91DC3F,0,20220623-00000,2022-06-23T11:00:00.000Z,2022-06-23T11:00:00.000Z,2022-06-23T11:00:00.000Z,14:5A:FC:91:DC:3F,,infra,,2,0,?,?,?,False,6,,wpa2,US,IN,I 74;I 465,Indianapolis,,46227
39.70827103,-86.30956268,Flock-7DC3F9,0,20220309-00000,2022-03-09T21:00:00.000Z,2022-03-09T19:00:00.000Z,2022-03-09T19:00:00.000Z,D8:F3:BC:7D:C3:F9,,infra,,2,0,?,?,?,False,11,,wpa2,US,IN,Colonel H. Weir Cook Memorial Drive,Indianapolis,,46231
39.70959091,-111.81737518,Flock-809883,0,20200831-00000,2020-08-31T14:00:00.000Z,2020-09-01T10:00:00.000Z,2022-07-08T04:00:00.000Z,E4:AA:EA:80:98:83,,infra,,2,0,?,?,?,False,1,,wpa2,US,UT,I 15,,,84648
39.71636963,-84.21875763,Flock-8957F1,0,20220320-00000,2022-03-20T16:00:00.000Z,2022-03-20T15:00:00.000Z,2022-03-20T15:00:00.000Z,74:4C:A1:89:57:F1,,infra,,2,0,?,?,?,False,11,,wpa2,US,OH,I 75,,,45409-2038
39.72936249,-86.32660675,Flock-68E609,0,20220224-00000,2022-02-24T11:00:00.000Z,2022-02-24T16:00:00.000Z,2022-02-24T16:00:00.000Z,74:4C:A1:68:E6:09,,infra,,2,0,?,?,?,False,1,,wpa2,US,IN,West Washington Street,,,46231
39.72972488,-105.20824432,Flock-892AE3,0,20220318-00000,2022-03-18T16:00:00.000Z,2022-03-18T17:00:00.000Z,2022-03-18T17:00:00.000Z,74:4C:A1:89:2A:E3,,infra,,2,0,?,?,?,False,6,,wpa2,US,CO,West 6th Avenue,,,80401
39.74727631,-84.17001343,Flock-7F6EC5,0,20200807-00000,2020-08-07T18:00:00.000Z,2020-08-07T18:00:00.000Z,2022-07-02T23:00:00.000Z,70:C9:4E:7F:6E:C5,,infra,,2,0,?,?,?,False,6,,wpa2,US,OH,Wyoming Street,Dayton,720,45410
39.74749374,-84.17053223,Flock-80A1F7,0,20200803-00000,2020-08-03T12:00:00.000Z,2020-08-03T14:00:00.000Z,2022-07-02T23:00:00.000Z,E4:AA:EA:80:A1:F7,,infra,,2,0,?,?,?,False,6,,wpa2,US,OH,Wyoming Street,Dayton,703,45410
39.7527504,-84.17623901,Flock-564FFF,6,20200704-00000,2020-07-03T16:00:00.000Z,2020-08-07T18:00:00.000Z,2022-07-02T23:00:00.000Z,E4:AA:EA:56:4F:FF,,infra,,2,0,?,?,?,False,6,,wpa2,US,OH,South Keowee Street,Dayton,601,45410
39.75283813,-84.15906525,Flock-564FD5,0,20200626-00000,2020-06-25T14:00:00.000Z,2020-06-27T05:00:00.000Z,2022-07-03T00:00:00.000Z,E4:AA:EA:56:4F:D5,,infra,,2,0,?,?,?,False,6,,wpa2,US,OH,Steve Whalen Boulevard,Dayton,,45403
39.77845383,-104.84622192,Flock-8FC6E8,0,20190924-00000,2019-09-20T11:00:00.000Z,2019-09-24T03:00:00.000Z,2022-07-11T06:00:00.000Z,B8:27:EB:8F:C6:E8,,infra,,2,0,?,?,?,False,7,,wpa2,US,CO,Peoria Street,Denver,4500,80239
39.8181839,-85.7689743,Flock-7EC697,0,20211120-00000,2021-11-20T19:00:00.000Z,2021-11-20T16:00:00.000Z,2021-11-20T16:00:00.000Z,74:4C:A1:7E:C6:97,,infra,,2,0,?,?,?,False,11,,wpa2,US,IN,East Martindale Drive,,,46140-0010
39.8218689,-86.27577972,Flock-B7856B,0,20220623-00000,2022-06-23T11:00:00.000Z,2022-06-23T11:00:00.000Z,2022-06-23T11:00:00.000Z,E0:0A:F6:B7:85:6B,,infra,,2,0,?,?,?,False,165,,wpa2,US,IN,I 465,Indianapolis,,46278
39.84180832,-84.1917572,Flock-7DC793,0,20210925-00000,2021-09-23T17:00:00.000Z,2021-09-25T17:00:00.000Z,2021-09-25T17:00:00.000Z,D8:F3:BC:7D:C7:93,,infra,,2,0,?,?,?,False,1,,wpa2,US,OH,Benchwood Road,,3418,45414
39.88228607,-82.82577515,Flock-3D1D49,0,20210617-00000,2021-06-17T21:00:00.000Z,2021-06-17T18:00:00.000Z,2022-07-05T05:00:00.000Z,D8:F3:BC:3D:1D:49,,infra,,2,0,?,?,?,False,1,,wpa2,US,OH,Gender Road,Columbus,4897,43110
39.90216064,-85.96079254,Flock-895BDD,0,20220112-00000,2022-01-12T08:00:00.000Z,2022-01-12T06:00:00.000Z,2022-01-12T06:00:00.000Z,74:4C:A1:89:5B:DD,,infra,,2,0,?,?,?,False,1,,wpa2,US,IN,Fox Road,,,46236
39.91429138,-105.00835419,Flock-E056F7,2,20211124-00000,2021-07-26T18:00:00.000Z,2022-02-09T12:00:00.000Z,2022-02-09T12:00:00.000Z,80:30:49:E0:56:F7,,infra,,2,0,?,?,?,False,1,,wpa2,US,CO,120th Ave MUP,Westminster,,80234
39.92611313,-86.03211975,Flock-3D1B21,2,20210430-00000,2021-04-30T18:00:00.000Z,2022-02-23T18:00:00.000Z,2022-02-23T18:00:00.000Z,D8:F3:BC:3D:1B:21,,infra,,2,0,?,?,?,False,1,,wpa2,US,IN,Corporation Drive,Indianapolis,,46256
39.92644882,-86.25403595,Flock-6FDEDF,0,20220312-00000,2022-03-12T12:00:00.000Z,2022-03-12T16:00:00.000Z,2022-03-12T16:00:00.000Z,14:5A:FC:6F:DE:DF,,infra,,2,0,?,?,?,False,11,,wpa2,US,IN,I 465,,,46077-0840
39.92704773,-86.03368378,Flock-3D0D87,0,20210430-00000,2021-04-30T19:00:00.000Z,2021-04-30T16:00:00.000Z,2022-06-29T01:00:00.000Z,D8:F3:BC:3D:0D:87,,infra,,2,0,?,?,?,False,1,,wpa2,US,IN,East 96th Street,Indianapolis,,46038
39.9270668,-86.02724457,Flock-3D1E6D,0,20220211-00000,2022-02-11T07:00:00.000Z,2022-02-11T05:00:00.000Z,2022-02-11T05:00:00.000Z,D8:F3:BC:3D:1E:6D,,infra,,2,0,?,?,?,False,1,,wpa2,US,IN,East 96th Street,Indianapolis,,46038
39.92707443,-86.030159,Flock-7DC669,1,20210527-00000,2021-05-27T17:00:00.000Z,2022-02-08T05:00:00.000Z,2022-02-08T05:00:00.000Z,D8:F3:BC:7D:C6:69,,infra,,2,0,?,?,?,False,11,,wpa2,US,IN,East 96th Street,Indianapolis,,46038
39.92713928,-86.01023865,Flock-3D0E49,0,20220213-00000,2022-02-13T13:00:00.000Z,2022-02-13T10:00:00.000Z,2022-02-13T11:00:00.000Z,D8:F3:BC:3D:0E:49,,infra,,2,0,?,?,?,False,6,,wpa2,US,IN,East 96th Street,Indianapolis,,46256
39.9275589,-86.25867462,Flock-E0553F,0,20211216-00000,2021-12-15T21:00:00.000Z,2021-12-16T05:00:00.000Z,2021-12-16T05:00:00.000Z,80:30:49:E0:55:3F,,infra,,2,0,?,?,?,False,1,,wpa2,US,IN,I 865,,,46077-0840
39.93582153,-82.78957367,Flock-8C7273,0,20220311-00000,2022-03-11T19:00:00.000Z,2022-03-11T16:00:00.000Z,2022-03-11T16:00:00.000Z,74:4C:A1:8C:72:73,,infra,,2,0,?,?,?,False,1,,wpa2,US,OH,Hill Road North,,,43147
39.93979263,-74.89927673,Flock-7F64D9,0,20200921-00000,2020-09-14T16:00:00.000Z,2020-09-21T06:00:00.000Z,2022-07-31T17:00:00.000Z,70:C9:4E:7F:64:D9,,infra,,2,0,?,?,?,False,11,,wpa2,US,NJ,Moorestown-Mount Laurel Road,,,08054
39.95380783,-86.01023102,Flock-68E59B,3,20220128-00000,2022-01-28T21:00:00.000Z,2022-02-06T13:00:00.000Z,2022-02-06T13:00:00.000Z,74:4C:A1:68:E5:9B,,infra,,2,0,?,?,?,False,6,,wpa2,US,IN,I 69;SR 37,,,46038
39.95476913,-86.00926971,Flock-21CC63,0,20210702-00000,2021-07-02T16:00:00.000Z,2021-07-02T14:00:00.000Z,2022-06-29T03:00:00.000Z,80:30:49:21:CC:63,,infra,,2,0,?,?,?,False,6,,wpa2,US,IN,I 69,,,46038
39.95492172,-86.00917053,Flock-8653DF,0,20220419-00000,2022-04-19T19:00:00.000Z,2022-04-19T17:00:00.000Z,2022-04-19T17:00:00.000Z,14:5A:FC:86:53:DF,,infra,,2,0,?,?,?,False,11,,wpa2,US,IN,I 69,,,46038
39.95597076,-86.00823975,Flock-7EC5F9,1,20220507-00000,2022-05-07T19:00:00.000Z,2022-07-05T05:00:00.000Z,2022-07-05T05:00:00.000Z,74:4C:A1:7E:C5:F9,,infra,,2,0,?,?,?,False,165,,wpa2,US,IN,SR 37,,,46038
39.95696259,-86.01139069,Flock-7EB037,2,20210923-00000,2021-09-23T12:00:00.000Z,2021-10-20T08:00:00.000Z,2021-10-20T08:00:00.000Z,74:4C:A1:7E:B0:37,,infra,,2,0,?,?,?,False,11,,wpa2,US,IN,Commercial Drive,,,46038
39.98875427,-83.06557465,Flock-8649F9,0,20220707-00000,2022-07-07T18:00:00.000Z,2022-07-07T15:00:00.000Z,2022-07-07T16:00:00.000Z,14:5A:FC:86:49:F9,,infra,,2,0,?,?,?,False,36,,wpa2,US,OH,Scioto Trail,,,43212
39.99259567,-85.92642975,Flock-3D12E9,1,20220129-00000,2022-01-29T17:00:00.000Z,2022-02-08T12:00:00.000Z,2022-02-08T12:00:00.000Z,D8:F3:BC:3D:12:E9,,infra,,2,0,?,?,?,False,11,,wpa2,US,IN,Campus Parkway,,,46060
39.99288177,-83.02268982,Flock-6FD765,0,20220509-00000,2022-05-09T15:00:00.000Z,2022-05-09T13:00:00.000Z,2022-05-09T13:00:00.000Z,14:5A:FC:6F:D7:65,,infra,,2,0,?,?,?,False,1,,wpa2,US,OH,Olentangy Trail,Columbus,,43210
39.99848175,-83.034935,Flock-8C797F,0,20220714-00000,2022-07-14T07:00:00.000Z,2022-07-14T08:00:00.000Z,2022-07-14T08:00:00.000Z,74:4C:A1:8C:79:7F,,infra,,2,0,?,?,?,False,165,,wpa2,US,OH,Kenny Road,Columbus,1929,43212
40.00113678,-82.99357605,Flock-896443,0,20211205-00000,2021-12-05T19:00:00.000Z,2021-12-05T16:00:00.000Z,2021-12-05T16:00:00.000Z,74:4C:A1:89:64:43,,infra,,2,0,?,?,?,False,1,,wpa2,US,OH,East Eleventh Avenue,Columbus,,43211
40.01411057,-83.01117706,Flock-7EBCBF,0,20220610-00000,2022-06-10T22:00:00.000Z,2022-06-10T19:00:00.000Z,2022-06-10T20:00:00.000Z,74:4C:A1:7E:BC:BF,,infra,,2,0,?,?,?,False,36,,wpa2,US,OH,North High Street,Columbus,,43235
40.01487732,-82.99610901,Flock-8962ED,0,20220612-00000,2022-06-12T09:00:00.000Z,2022-06-12T07:00:00.000Z,2022-06-12T07:00:00.000Z,74:4C:A1:89:62:ED,,infra,,2,0,?,?,?,False,48,,wpa2,US,OH,East Hudson Street,Columbus,,43211
40.03387833,-85.9934845,Flock-BDC1E3,1,20210427-00000,2021-04-27T18:00:00.000Z,2021-05-22T15:00:00.000Z,2022-06-29T03:00:00.000Z,3C:91:80:BD:C1:E3,,infra,,2,0,?,?,?,False,11,,wpa2,US,IN,Town & Country Boulevard,,10002,46060
40.05036163,-105.91833496,Flock-7EC6F1,0,20220330-00000,2022-03-30T09:00:00.000Z,2022-04-01T07:00:00.000Z,2022-04-01T07:00:00.000Z,74:4C:A1:7E:C6:F1,,infra,,2,0,?,?,?,False,1,,wpa2,US,CO,Big Horn Court,,44,
40.05886841,-82.97298431,Flock-8961BB,0,20220527-00000,2022-05-27T10:00:00.000Z,2022-05-27T07:00:00.000Z,2022-05-27T07:00:00.000Z,74:4C:A1:89:61:BB,,infra,,2,0,?,?,?,False,157,,wpa2,US,OH,Morse Road,Columbus,1745,43229
40.08582687,-82.9546814,Flock-FA28DF,0,20181212-00000,2018-11-03T22:00:00.000Z,2018-12-12T04:00:00.000Z,2022-07-05T01:00:00.000Z,B8:27:EB:FA:28:DF,,infra,,2,0,?,?,?,False,7,,wpa2,US,OH,East Dublin Granville Road,Columbus,,43234
40.35199738,-74.07254028,Flock-56509D,0,20210720-00000,2021-07-20T19:00:00.000Z,2021-07-20T16:00:00.000Z,2022-08-10T03:00:00.000Z,E4:AA:EA:56:50:9D,,infra,,2,0,?,?,?,False,6,,wpa2,US,NJ,Riverside Avenue,,,07701
40.38251114,-74.3885498,Flock-574FAB,0,20231031-00000,2023-10-31T12:00:00.000Z,2023-10-31T15:00:00.000Z,2023-10-31T15:00:00.000Z,F4:6A:DD:57:4F:AB,,infra,,2,0,?,?,?,False,153,,wpa2,US,NJ,De Voe Avenue,,,08831
40.51366806,-74.2870636,Flock-7DCB75,0,20211106-00000,2021-11-06T18:00:00.000Z,2021-11-06T16:00:00.000Z,2021-11-06T16:00:00.000Z,D8:F3:BC:7D:CB:75,,infra,,2,0,?,?,?,False,6,,wpa2,US,NJ,NJ 35,,,08861
40.51978302,-74.28262329,Flock-68DEC5,0,20211106-00000,2021-11-06T18:00:00.000Z,2021-11-06T16:00:00.000Z,2021-11-06T16:00:00.000Z,74:4C:A1:68:DE:C5,,infra,,2,0,?,?,?,False,11,,wpa2,US,NJ,Convery Boulevard,,501,08861
40.61735916,-75.49795532,Flock-57A3CB,0,20231212-00000,2023-12-12T18:00:00.000Z,2023-12-12T10:00:00.000Z,2023-12-12T10:00:00.000Z,D0:39:57:57:A3:CB,,infra,,2,0,?,?,?,False,161,,wpa2,US,PA,Mauch Chunk Road,Allentown,,18102:18104
40.63464737,-74.31689453,Flock-8648F9,1,20220710-00000,2022-07-10T16:00:00.000Z,2022-07-22T11:00:00.000Z,2022-07-22T14:00:00.000Z,14:5A:FC:86:48:F9,,infra,,2,0,?,?,?,False,165,,wpa2,US,NJ,Central Avenue,,,07090
40.65182114,-75.41260529,Flock-7DCEF7,3,20211006-00000,2021-10-06T15:00:00.000Z,2021-11-23T14:00:00.000Z,2021-11-23T14:00:00.000Z,D8:F3:BC:7D:CE:F7,,infra,,2,0,?,?,?,False,11,,wpa2,US,PA,Schoenersville Road,,3050,18017
40.72689056,-111.9382782,Flock-8651CB,0,20220601-00000,2022-05-06T23:00:00.000Z,2022-06-01T23:00:00.000Z,2022-06-01T23:00:00.000Z,14:5A:FC:86:51:CB,,infra,,2,0,?,?,?,False,6,,wpa2,US,UT,Redwood Road,Salt Lake City,2055,84119
40.83909607,-73.0115509,Flock-736A9D,5,20240221-00000,2024-02-21T23:00:00.000Z,2024-05-23T15:00:00.000Z,2024-05-23T16:00:00.000Z,9C:2F:9D:73:6A:9D,,infra,,2,0,?,?,?,False,2,0,wpa2,US,NY,Granny Road,,178,11738
40.85508728,-81.42453003,Flock-6754E3,0,20220702-00000,2022-07-02T15:00:00.000Z,2022-07-02T13:00:00.000Z,2022-07-02T14:00:00.000Z,94:08:53:67:54:E3,,infra,,2,0,?,?,?,False,48,,wpa2,US,OH,Belden Village Street Northwest,,,44718
40.89445496,-74.4717865,Flock-3D19C9,0,20210519-00000,2021-05-19T18:00:00.000Z,2021-05-19T18:00:00.000Z,2022-08-01T13:00:00.000Z,D8:F3:BC:3D:19:C9,,infra,,2,0,?,?,?,False,11,,wpa2,US,NJ,Pocono Road,,,07834
40.89586258,-74.4701004,Flock-BAEE43,0,20210311-00000,2021-03-11T13:00:00.000Z,2021-03-11T11:00:00.000Z,2022-08-01T13:00:00.000Z,3C:91:80:BA:EE:43,,infra,,2,0,?,?,?,False,6,,wpa2,US,NJ,Pocono Road,,,07834
40.9178772,-98.35692596,Flock-512987,0,20231109-00000,2023-11-06T19:00:00.000Z,2023-11-09T00:00:00.000Z,2023-11-09T01:00:00.000Z,F4:6A:DD:51:29:87,,infra,,2,0,?,?,?,False,161,,wpa2,US,NE,West 2nd Street,Grand Island,,68801
41.14136124,-111.9165802,Flock-89870B,0,20220706-00000,2022-07-06T08:00:00.000Z,2022-07-06T15:00:00.000Z,2022-07-06T15:00:00.000Z,74:4C:A1:89:87:0B,,infra,,2,0,?,?,?,False,161,,wpa2,US,UT,US 89,,,84405
41.15647507,-112.02594757,Flock-892D05,0,20220130-00000,2022-01-29T00:00:00.000Z,2022-01-30T17:00:00.000Z,2022-01-30T17:00:00.000Z,74:4C:A1:89:2D:05,,infra,,2,0,?,?,?,False,6,,wpa2,US,UT,South 1900 West,,,84056
41.17063904,-86.24125671,Flock-574AF7,0,20230908-00000,2023-09-08T15:00:00.000Z,2023-09-08T09:00:00.000Z,2023-09-08T10:00:00.000Z,F4:6A:DD:57:4A:F7,,infra,,2,0,?,?,?,False,44,,wpa2,US,IN,US 31,,,46975
41.19532776,-112.04330444,Flock-6FD839,2,20220316-00000,2022-03-15T08:00:00.000Z,2022-07-23T14:00:00.000Z,2022-07-23T16:00:00.000Z,14:5A:FC:6F:D8:39,,infra,,2,0,?,?,?,False,36,,wpa2,US,UT,Midland Drive,,3750,84067
41.21179199,-111.97073364,Flock-809B93,0,20220112-00000,2022-01-12T17:00:00.000Z,2022-01-12T17:00:00.000Z,2022-01-12T17:00:00.000Z,E4:AA:EA:80:9B:93,,infra,,2,0,?,?,?,False,6,,wpa2,US,UT,Washington Boulevard,,2917,84401
41.21269989,-111.9706955,Flock-6FDA7B,1,20220715-00000,2022-07-15T17:00:00.000Z,2022-07-23T14:00:00.000Z,2022-07-23T16:00:00.000Z,14:5A:FC:6F:DA:7B,,infra,,2,0,?,?,?,False,44,,wpa2,US,UT,Washington Boulevard,Ogden,,84408
41.21508408,-111.97066498,Flock-21D0FB,1,20210317-00000,2021-03-17T19:00:00.000Z,2021-07-08T19:00:00.000Z,2022-07-07T04:00:00.000Z,80:30:49:21:D0:FB,,infra,,2,0,?,?,?,False,11,,wpa2,US,UT,Washington Boulevard,,2759,84401
41.21798706,-111.95989227,Flock-2818D7,0,20211209-00000,2021-12-07T08:00:00.000Z,2021-12-09T07:00:00.000Z,2021-12-09T07:00:00.000Z,94:08:53:28:18:D7,,infra,,2,0,?,?,?,False,11,,wpa2,US,UT,26th Street,,807,84401
41.21848679,-111.96871948,Flock-E05AA9,0,20210225-00000,2021-02-25T16:00:00.000Z,2021-02-25T18:00:00.000Z,2022-07-07T05:00:00.000Z,80:30:49:E0:5A:A9,,infra,,2,0,?,?,?,False,1,,wpa2,US,UT,26th Street,,459,84401
41.22267532,-111.97631836,Flock-3D0C4B,0,20220304-00000,2022-03-04T14:00:00.000Z,2022-03-04T18:00:00.000Z,2022-03-04T18:00:00.000Z,D8:F3:BC:3D:0C:4B,,infra,,2,0,?,?,?,False,1,,wpa2,US,UT,24th Street,,195,84401
41.23109818,-111.97034454,Flock-895699,0,20220211-00000,2022-02-11T10:00:00.000Z,2022-02-11T14:00:00.000Z,2022-02-11T14:00:00.000Z,74:4C:A1:89:56:99,,infra,,2,0,?,?,?,False,1,,wpa2,US,UT,20th Street,,399,84401
41.23224258,-95.87612915,Flock-8647AF,0,20220729-00000,2022-07-27T18:00:00.000Z,2022-07-29T14:00:00.000Z,2022-07-29T14:00:00.000Z,14:5A:FC:86:47:AF,,infra,,2,0,?,?,?,False,6,,wpa2,US,IA,I 80 Express,Council Bluffs,,51501
41.24438858,-111.9747467,Flock-E05637,0,20211027-00000,2021-10-27T18:00:00.000Z,2021-10-27T19:00:00.000Z,2021-10-27T19:00:00.000Z,80:30:49:E0:56:37,,infra,,2,0,?,?,?,False,11,,wpa2,US,UT,12th Street,,,84404
41.2443924,-111.97572327,Flock-892B81,0,20220419-00000,2022-04-19T08:00:00.000Z,2022-04-19T07:00:00.000Z,2022-04-19T07:00:00.000Z,74:4C:A1:89:2B:81,,infra,,2,0,?,?,?,False,11,,wpa2,US,UT,12th Street,,,84404
41.24444199,-111.99224091,Flock-8956CF,2,20220211-00000,2022-02-11T08:00:00.000Z,2022-03-18T14:00:00.000Z,2022-03-18T14:00:00.000Z,74:4C:A1:89:56:CF,,infra,,2,0,?,?,?,False,6,,wpa2,US,UT,West 12th Street,,616,84404
41.24562454,-86.2612915,Flock-7EAE8F,0,20220715-00000,2022-07-15T12:00:00.000Z,2022-07-15T13:00:00.000Z,2022-07-15T13:00:00.000Z,74:4C:A1:7E:AE:8F,,infra,,2,0,?,?,?,False,48,,wpa2,US,IN,US 31,,,46501
41.25938416,-111.98931122,Flock-7EBBB1,0,20211029-00000,2021-10-28T09:00:00.000Z,2021-10-29T15:00:00.000Z,2021-10-29T15:00:00.000Z,74:4C:A1:7E:BB:B1,,infra,,2,0,?,?,?,False,11,,wpa2,US,UT,West 2nd Street,,401,84404
41.26468658,-95.98090363,Flock-54D935,0,20240522-00000,2024-05-23T00:00:00.000Z,2024-05-22T18:00:00.000Z,2024-05-22T19:00:00.000Z,D0:39:57:54:D9:35,,infra,,2,0,?,?,?,False,40,0,wpa2,US,NE,California Street,Omaha,,68132
41.32081604,-96.04550171,Flock-675727,0,20220516-00000,2022-05-13T13:00:00.000Z,2022-05-16T23:00:00.000Z,2022-05-16T23:00:00.000Z,94:08:53:67:57:27,,infra,,2,0,?,?,?,False,1,,wpa2,US,NE,Sorensen Parkway,Omaha,,68122
41.39822769,-81.46850586,Flock-7DCCF1,0,20220221-00000,2022-02-21T14:00:00.000Z,2022-02-21T15:00:00.000Z,2022-02-21T15:00:00.000Z,D8:F3:BC:7D:CC:F1,,infra,,2,0,?,?,?,False,6,,wpa2,US,OH,Aurora Road,,29605,44139
41.39872742,-81.66000366,Flock-7ACD8F,0,20220531-00000,2022-05-31T17:00:00.000Z,2022-05-31T14:00:00.000Z,2022-05-31T14:00:00.000Z,14:5A:FC:7A:CD:8F,,infra,,2,0,?,?,?,False,40,,wpa2,US,OH,Rockside Road,,4401,44131
41.4247818,-81.54044342,Flock-7EC965,2,20220216-00000,2022-02-16T21:00:00.000Z,2022-03-21T05:00:00.000Z,2022-03-21T05:00:00.000Z,74:4C:A1:7E:C9:65,,infra,,2,0,?,?,?,False,1,,wpa2,US,OH,Outerbelt South Freeway,,,44128
41.42559814,-81.51822662,Flock-8955DB,0,20220323-00000,2022-03-23T07:00:00.000Z,2022-03-23T05:00:00.000Z,2022-03-23T05:00:00.000Z,74:4C:A1:89:55:DB,,infra,,2,0,?,?,?,False,11,,wpa2,US,OH,I 480N,,,44146
41.42613983,-81.73445892,Flock-7ACC05,0,20220726-00000,2022-07-17T15:00:00.000Z,2022-07-26T13:00:00.000Z,2022-07-26T13:00:00.000Z,14:5A:FC:7A:CC:05,,infra,,2,0,?,?,?,False,48,,wpa2,US,OH,Ridge Road,,4738,44144
41.42683411,-87.76091003,Flock-E059AF,0,20210901-00000,2021-09-01T15:00:00.000Z,2021-09-01T18:00:00.000Z,2021-09-01T18:00:00.000Z,80:30:49:E0:59:AF,,infra,,2,0,?,?,?,False,11,,wpa2,US,IL,West Monee Manhattan Road,,,60449
41.43607712,-86.92957306,Flock-7EBABB,2,20220118-00000,2022-01-18T17:00:00.000Z,2022-06-17T15:00:00.000Z,2022-06-17T16:00:00.000Z,74:4C:A1:7E:BA:BB,,infra,,2,0,?,?,?,False,40,,wpa2,US,IN,Lincoln Highway,,11824,46390
41.43617249,-86.93345642,Flock-7ACC87,0,20220617-00000,2022-06-17T16:00:00.000Z,2022-06-17T15:00:00.000Z,2022-06-17T16:00:00.000Z,14:5A:FC:7A:CC:87,,infra,,2,0,?,?,?,False,40,,wpa2,US,IN,US 30,,,46385:46390
41.44042206,-81.65027618,Flock-675FC1,0,20220729-00000,2022-07-29T13:00:00.000Z,2022-07-29T18:00:00.000Z,2022-07-29T18:00:00.000Z,94:08:53:67:5F:C1,,infra,,2,0,?,?,?,False,44,,wpa2,US,OH,Willow Freeway,,,44105
41.45107651,-87.02207947,Flock-6FE10D,0,20220512-00000,2022-05-11T09:00:00.000Z,2022-05-12T06:00:00.000Z,2022-05-12T06:00:00.000Z,14:5A:FC:6F:E1:0D,,infra,,2,0,?,?,?,False,40,,wpa2,US,IN,US 30,,,46385
41.45164871,-81.49077606,Flock-677D81,2,20220422-00000,2022-04-22T14:00:00.000Z,2022-04-23T08:00:00.000Z,2022-04-23T08:00:00.000Z,94:08:53:67:7D:81,,infra,,2,0,?,?,?,False,11,,wpa2,US,OH,Outerbelt East Freeway,,,44122
41.45324707,-81.49058533,Flock-E05719,0,20220419-00000,2022-04-19T14:00:00.000Z,2022-04-19T11:00:00.000Z,2022-04-19T11:00:00.000Z,80:30:49:E0:57:19,,infra,,2,0,?,?,?,False,1,,wpa2,US,OH,Outerbelt East Freeway,,,44122
41.4589119,-87.02422333,Flock-6772E1,0,20220721-00000,2022-07-12T07:00:00.000Z,2022-07-21T06:00:00.000Z,2022-07-21T06:00:00.000Z,94:08:53:67:72:E1,,infra,,2,0,?,?,?,False,48,,wpa2,US,IN,Leonard Drive,Valparaiso,,46383
41.46751022,-81.78983307,Flock-281A0B,0,20211002-00000,2021-09-30T16:00:00.000Z,2021-10-02T04:00:00.000Z,2021-10-02T04:00:00.000Z,94:08:53:28:1A:0B,,infra,,2,0,?,?,?,False,1,,wpa2,US,OH,West 140th Street,Cleveland,,44111
41.46947479,-81.95089722,Flock-8C7265,0,20220307-00000,2022-03-06T10:00:00.000Z,2022-03-07T11:00:00.000Z,2022-03-07T11:00:00.000Z,74:4C:A1:8C:72:65,,infra,,2,0,?,?,?,False,6,,wpa2,US,OH,Crocker Road,,1198,44145
41.47177124,-81.82420349,Flock-3D1E41,0,20220301-00000,2022-03-01T22:00:00.000Z,2022-03-01T21:00:00.000Z,2022-03-01T21:00:00.000Z,D8:F3:BC:3D:1E:41,,infra,,2,0,?,?,?,False,11,,wpa2,US,OH,Hilliard Boulevard,,,44116
41.4721489,-81.84312439,Flock-3D0EA5,0,20210929-00000,2021-09-29T09:00:00.000Z,2021-09-29T06:00:00.000Z,2021-09-29T06:00:00.000Z,D8:F3:BC:3D:0E:A5,,infra,,2,0,?,?,?,False,11,,wpa2,US,OH,Northwest Freeway,,,44116
41.48255157,-87.98388672,FLOCK-123DEF,1,20210603-00000,2021-06-03T12:00:00.000Z,2021-12-31T19:00:00.000Z,2021-12-31T19:00:00.000Z,08:3A:88:20:F3:28,,infra,,2,0,?,?,?,False,1,,wpa2,US,IL,Nelson Road,,,60451
41.48429871,-87.70450592,Flock-3D1691,0,20210621-00000,2021-06-21T15:00:00.000Z,2021-06-21T16:00:00.000Z,2022-06-25T17:00:00.000Z,D8:F3:BC:3D:16:91,,infra,,2,0,?,?,?,False,11,,wpa2,US,IL,Sauk Trail,,,60443
41.48756027,-81.76875305,Flock-7DC6AF,0,20211012-00000,2021-10-09T23:00:00.000Z,2021-10-12T10:00:00.000Z,2021-10-12T10:00:00.000Z,D8:F3:BC:7D:C6:AF,,infra,,2,0,?,?,?,False,6,,wpa2,US,OH,West 117th Street,,,44111
41.49489212,-87.71305084,Flock-7DC51B,1,20211020-00000,2021-10-20T17:00:00.000Z,2022-02-04T11:00:00.000Z,2022-02-04T11:00:00.000Z,D8:F3:BC:7D:C5:1B,,infra,,2,0,?,?,?,False,11,,wpa2,US,IL,Governors Highway,,21800,60443
41.503479,-87.88922882,Flock-21D74F,0,20210110-00000,2021-01-10T19:00:00.000Z,2021-01-10T18:00:00.000Z,2022-06-25T00:00:00.000Z,80:30:49:21:D7:4F,,infra,,2,0,?,?,?,False,11,,wpa2,US,IL,Lincoln Highway,,,60423:60451
41.50441742,-87.88962555,Flock-3D1B75,2,20210619-00000,2021-06-19T16:00:00.000Z,2021-07-06T14:00:00.000Z,2022-06-25T00:00:00.000Z,D8:F3:BC:3D:1B:75,,infra,,2,0,?,?,?,False,11,,wpa2,US,IL,Hickory Creek Bikeway,,11200,60448
41.5062561,-87.73670959,Flock-7DD13D,0,20220112-00000,2022-01-12T22:00:00.000Z,2022-01-12T14:00:00.000Z,2022-01-12T14:00:00.000Z,D8:F3:BC:7D:D1:3D,,infra,,2,0,?,?,?,False,6,,wpa2,US,IL,Lincoln Highway,,,60443
41.50635147,-87.79800415,Flock-68E0AD,0,20220610-00000,2022-06-10T17:00:00.000Z,2022-06-10T15:00:00.000Z,2022-06-10T16:00:00.000Z,74:4C:A1:68:E0:AD,,infra,,2,0,?,?,?,False,165,,wpa2,US,IL,West Lincoln Highway,,7798,60423
41.50681686,-87.73712158,Flock-7DC9DB,0,20220112-00000,2022-01-12T22:00:00.000Z,2022-01-13T11:00:00.000Z,2022-01-13T11:00:00.000Z,D8:F3:BC:7D:C9:DB,,infra,,2,0,?,?,?,False,6,,wpa2,US,IL,Matteson Avenue,,21050,60443
41.51067352,-87.92754364,Flock-8652DB,0,20220417-00000,2022-04-17T13:00:00.000Z,2022-04-17T13:00:00.000Z,2022-04-17T13:00:00.000Z,14:5A:FC:86:52:DB,,infra,,2,0,?,?,?,False,1,,wpa2,US,IL,East Lincoln Highway,,,60451
41.51075363,-87.92708588,Flock-1277FD,0,20210915-00000,2021-09-15T13:00:00.000Z,2021-09-15T12:00:00.000Z,2021-09-15T12:00:00.000Z,80:30:49:12:77:FD,,infra,,2,0,?,?,?,False,6,,wpa2,US,IL,Lincoln Highway,,,60451
41.51239777,-87.95147705,Flock-3D1CAB,1,20210515-00000,2021-05-15T19:00:00.000Z,2021-06-15T21:00:00.000Z,2022-06-24T19:00:00.000Z,D8:F3:BC:3D:1C:AB,,infra,,2,0,?,?,?,False,6,,wpa2,US,IL,East Lincoln Highway,,621,60451
41.51258469,-87.95291138,Flock-3D15C7,6,20210329-00000,2021-03-29T17:00:00.000Z,2021-12-20T19:00:00.000Z,2021-12-20T19:00:00.000Z,D8:F3:BC:3D:15:C7,,infra,,2,0,?,?,?,False,1,,wpa2,US,IL,East Lincoln Highway,,611,60451
41.51346207,-87.96502686,Flock-E05557,0,20210607-00000,2021-06-07T09:00:00.000Z,2021-06-07T20:00:00.000Z,2022-06-24T18:00:00.000Z,80:30:49:E0:55:57,,infra,,2,0,?,?,?,False,11,,wpa2,US,IL,,,,60451
41.52103806,-87.99711609,Flock-E05543,3,20210902-00000,2021-09-02T06:00:00.000Z,2021-11-09T07:00:00.000Z,2021-11-09T07:00:00.000Z,80:30:49:E0:55:43,,infra,,2,0,?,?,?,False,11,,wpa2,US,IL,West Maple Street,,,60433
41.53115082,-87.95359039,FLOCK-123DEF,6,20210523-00000,2021-05-24T00:00:00.000Z,2022-03-03T02:00:00.000Z,2022-03-03T02:00:00.000Z,08:3A:88:20:F3:8C,,infra,,2,0,?,?,?,False,1,,wpa2,US,IL,Francis Road,,,60448
41.53288651,-87.92837524,Flock-809C6F,1,20210216-00000,2021-02-16T20:00:00.000Z,2021-02-28T17:00:00.000Z,2022-06-24T21:00:00.000Z,E4:AA:EA:80:9C:6F,,infra,,2,0,?,?,?,False,1,,wpa2,US,IL,Francis Road,,,60448
41.53292847,-87.92747498,Flock-7EB1DD,0,20220319-00000,2022-03-19T20:00:00.000Z,2022-03-19T18:00:00.000Z,2022-03-19T18:00:00.000Z,74:4C:A1:7E:B1:DD,,infra,,2,0,?,?,?,False,11,,wpa2,US,IL,Francis Road,,,60448
41.54919052,-87.91709137,Flock-7EBA7F,0,20211127-00000,2021-11-27T17:00:00.000Z,2021-11-27T15:00:00.000Z,2021-11-27T15:00:00.000Z,74:4C:A1:7E:BA:7F,,infra,,2,0,?,?,?,False,1,,wpa2,US,IL,Maple Street,,,60448
41.55062103,-87.22015381,Flock-898671,0,20220420-00000,2022-04-20T15:00:00.000Z,2022-04-20T15:00:00.000Z,2022-04-20T15:00:00.000Z,74:4C:A1:89:86:71,,infra,,2,0,?,?,?,False,11,,wpa2,US,IN,37th Avenue,,,46368
41.57091141,-87.04608154,Flock-6FDA15,0,20220717-00000,2022-07-17T14:00:00.000Z,2022-07-17T13:00:00.000Z,2022-07-22T19:00:00.000Z,14:5A:FC:6F:DA:15,,infra,,2,0,?,?,?,False,165,,wpa2,US,IN,SR 49,,,46304:46383
41.58161545,-87.63632202,Flock-7DB809,0,20211117-00000,2021-11-17T11:00:00.000Z,2021-11-17T10:00:00.000Z,2021-11-17T10:00:00.000Z,D8:F3:BC:7D:B8:09,,infra,,2,0,?,?,?,False,11,,wpa2,US,IL,Halsted Street,,17399,60473
41.58687973,-87.72468567,Flock-8C7E57,0,20220113-00000,2022-01-13T16:00:00.000Z,2022-01-13T11:00:00.000Z,2022-01-13T11:00:00.000Z,74:4C:A1:8C:7E:57,,infra,,2,0,?,?,?,False,1,,wpa2,US,IL,167th Street,,,60478
41.59809875,-87.68126678,Flock-21D4CD,0,20210221-00000,2021-02-21T14:00:00.000Z,2021-02-21T12:00:00.000Z,2022-06-25T22:00:00.000Z,80:30:49:21:D4:CD,,infra,,2,0,?,?,?,False,6,,wpa2,US,IL,Tri-State Tollway,,,60428
41.60082245,-87.65126801,Flock-3D28F3,0,20211114-00000,2021-11-14T22:00:00.000Z,2021-11-14T23:00:00.000Z,2021-11-14T23:00:00.000Z,D8:F3:BC:3D:28:F3,,infra,,2,0,?,?,?,False,1,,wpa2,US,IL,East 159th Street,,84,60426
41.61872864,-87.78593445,Flock-7EB215,0,20220603-00000,2022-06-03T15:00:00.000Z,2022-06-03T13:00:00.000Z,2022-06-03T17:00:00.000Z,74:4C:A1:7E:B2:15,,infra,,2,0,?,?,?,False,44,,wpa2,US,IL,Oak Park Avenue,,,60477
41.63021851,-93.73667145,Flock-C0AAEB,0,20220527-00000,2022-05-23T19:00:00.000Z,2022-05-27T16:00:00.000Z,2022-05-27T16:00:00.000Z,E0:0A:F6:C0:AA:EB,,infra,,2,0,?,?,?,False,44,,wpa2,US,IA,Douglas Avenue,,8525,50322
41.64410782,-93.50836945,Flock-C0AC35,0,20220518-00000,2022-05-18T19:00:00.000Z,2022-05-18T18:00:00.000Z,2022-05-18T18:00:00.000Z,E0:0A:F6:C0:AC:35,,infra,,2,0,?,?,?,False,36,,wpa2,US,IA,8th Street Southwest,,3831,50009
41.65008926,-81.36751556,Flock-7DCBFF,0,20220216-00000,2022-01-27T18:00:00.000Z,2022-02-16T10:00:00.000Z,2022-02-16T10:00:00.000Z,D8:F3:BC:7D:CB:FF,,infra,,2,0,?,?,?,False,6,,wpa2,US,OH,Johnnycake Ridge Road,Mentor,7671,44060
41.65138626,-87.69931793,Flock-7EAFA3,0,20211129-00000,2021-11-18T13:00:00.000Z,2021-11-29T17:00:00.000Z,2021-11-29T17:00:00.000Z,74:4C:A1:7E:AF:A3,,infra,,2,0,?,?,?,False,1,,wpa2,US,IL,South Kedzie Avenue,,,60472
41.66305542,-86.73863983,Flock-7EB35F,0,20210915-00000,2021-09-15T12:00:00.000Z,2021-09-15T13:00:00.000Z,2021-09-15T13:00:00.000Z,74:4C:A1:7E:B3:5F,,infra,,2,0,?,?,?,False,1,,wpa2,US,IN,State Road 39,,3899,46350
41.69289398,-86.80622864,Flock-7EB75D,1,20211124-00000,2021-11-24T23:00:00.000Z,2021-11-24T16:00:00.000Z,2021-11-24T16:00:00.000Z,74:4C:A1:7E:B7:5D,,infra,,2,0,?,?,?,False,6,,wpa2,US,IN,US 20,,,
41.722435,-88.03408051,Flock-7AD169,0,20220525-00000,2022-05-25T13:00:00.000Z,2022-05-25T11:00:00.000Z,2022-05-25T23:00:00.000Z,14:5A:FC:7A:D1:69,,infra,,2,0,?,?,?,False,40,,wpa2,US,IL,Veterans Memorial Tollway,,,60532
41.72271347,-88.03940582,Flock-7DCA89,0,20220326-00000,2022-03-26T11:00:00.000Z,2022-03-26T12:00:00.000Z,2022-03-26T12:00:00.000Z,D8:F3:BC:7D:CA:89,,infra,,2,0,?,?,?,False,1,,wpa2,US,IL,East Boughton Road,,,60440
41.72439194,-88.03721619,Flock-479BF3,0,20210704-00000,2021-07-02T12:00:00.000Z,2021-07-04T06:00:00.000Z,2022-06-24T13:00:00.000Z,F8:A2:D6:47:9B:F3,,infra,,2,0,?,?,?,False,1,,wpa2,US,IL,East Boughton Road,,718,60532
41.74510956,-88.11817169,Flock-809ADF,0,20220116-00000,2022-01-16T12:00:00.000Z,2022-01-16T11:00:00.000Z,2022-01-16T11:00:00.000Z,E4:AA:EA:80:9A:DF,,infra,,2,0,?,?,?,False,11,,wpa2,US,IL,Naper Boulevard,Naperville,,60565
41.7538414,-71.46372986,Flock-7DBEA1,0,20211110-00000,2021-11-10T21:00:00.000Z,2021-11-10T21:00:00.000Z,2021-11-10T21:00:00.000Z,D8:F3:BC:7D:BE:A1,,infra,,2,0,?,?,?,False,11,,wpa2,US,RI,New London Avenue,Cranston,,02920
41.78553391,-71.43148804,Flock-895B33,0,20220421-00000,2022-04-21T18:00:00.000Z,2022-04-21T20:00:00.000Z,2022-04-21T21:00:00.000Z,74:4C:A1:89:5B:33,,infra,,2,0,?,?,?,False,1,,wpa2,US,RI,Pontiac Avenue,Providence,98,02907
41.83960342,-88.0049057,Flock-281D63,0,20220724-00000,2022-07-24T12:00:00.000Z,2022-07-24T17:00:00.000Z,2022-07-24T18:00:00.000Z,94:08:53:28:1D:63,,infra,,2,0,?,?,?,False,44,,wpa2,US,IL,Yorktown Center Drive,,,60515:60523
42.04073715,-87.79953766,Flock-864B19,0,20220617-00000,2022-06-17T13:00:00.000Z,2022-06-17T14:00:00.000Z,2022-06-17T14:00:00.000Z,14:5A:FC:86:4B:19,,infra,,2,0,?,?,?,False,36,,wpa2,US,IL,West Dempster Street,,,60068
42.04755783,-87.80660248,Flock-4ED7C1,0,20240421-00000,2024-04-21T20:00:00.000Z,2024-04-21T13:00:00.000Z,2024-04-21T14:00:00.000Z,F4:6A:DD:4E:D7:C1,,infra,,2,0,?,?,?,False,36,0,wpa2,US,IL,Shermer Road,,,60025
42.07585144,-71.41925812,Flock-73665D,0,20230622-00000,2023-06-22T13:00:00.000Z,2023-06-22T11:00:00.000Z,2023-06-22T11:00:00.000Z,9C:2F:9D:73:66:5D,,infra,,2,0,?,?,?,False,161,,wpa2,US,MA,Grove Street,,122,02038-3108
42.13829803,-87.84401703,Flock-7EC151,4,20211022-00000,2021-10-22T18:00:00.000Z,2021-10-25T18:00:00.000Z,2021-10-25T18:00:00.000Z,74:4C:A1:7E:C1:51,,infra,,2,0,?,?,?,False,6,,wpa2,US,IL,Dundee Road,,2641,60062
42.14580917,-88.02471161,Flock-68E47B,0,20220204-00000,2022-02-04T15:00:00.000Z,2022-02-04T15:00:00.000Z,2022-02-04T15:00:00.000Z,74:4C:A1:68:E4:7B,,infra,,2,0,?,?,?,False,6,,wpa2,US,IL,North Old Hicks Road,,1964,60074
42.26410294,-87.86333466,Flock-60324F,0,20240425-00000,2024-04-25T19:00:00.000Z,2024-04-25T16:00:00.000Z,2024-04-25T17:00:00.000Z,D0:39:57:60:32:4F,,infra,,2,0,?,?,?,False,36,0,wpa2,US,IL,South Skokie Highway,Lake Forest,,60044
42.27197647,-85.62490845,Flock-6FE3DF,0,20220710-00000,2022-07-09T13:00:00.000Z,2022-07-10T11:00:00.000Z,2022-07-10T11:00:00.000Z,14:5A:FC:6F:E3:DF,,infra,,2,0,?,?,?,False,149,,wpa2,US,MI,Rambling Road,Kalamazoo,2016,49008
42.2814064,-71.03569794,Flock-BDB4E1,0,20200903-00000,2020-09-03T14:00:00.000Z,2020-09-03T15:00:00.000Z,2022-08-28T21:00:00.000Z,3C:91:80:BD:B4:E1,,infra,,2,0,?,?,?,False,11,,wpa2,US,MA,Hancock Street,Quincy,,02171
42.28561783,-85.62248993,Flock-7DD53F,0,20220212-00000,2022-02-11T15:00:00.000Z,2022-02-12T15:00:00.000Z,2022-02-12T15:00:00.000Z,D8:F3:BC:7D:D5:3F,,infra,,2,0,?,?,?,False,6,,wpa2,US,MI,South Howard Street,Kalamazoo,,49006
42.2922554,-85.58974457,Flock-7DC8FB,0,20220207-00000,2022-02-05T17:00:00.000Z,2022-02-07T20:00:00.000Z,2022-02-07T20:00:00.000Z,D8:F3:BC:7D:C8:FB,,infra,,2,0,?,?,?,False,11,,wpa2,US,MI,North Westnedge Avenue,Kalamazoo,184,49007
42.30895233,-85.55234528,Flock-969A6D,0,20220719-00000,2022-07-19T19:00:00.000Z,2022-07-19T18:00:00.000Z,2022-07-19T18:00:00.000Z,14:5A:FC:96:9A:6D,,infra,,2,0,?,?,?,False,40,,wpa2,US,MI,Gull Road,,,49083
42.38975525,-71.04139709,Flock-564BCD,0,20210818-00000,2021-08-16T19:00:00.000Z,2021-08-18T16:00:00.000Z,2022-08-28T20:00:00.000Z,E4:AA:EA:56:4B:CD,,infra,,2,0,?,?,?,False,11,,wpa2,US,MA,Chestnut Street,Chelsea,74,02150
42.39070511,-70.9806366,Flock-564B3F,0,20200922-00000,2020-09-22T16:00:00.000Z,2020-09-22T14:00:00.000Z,2022-08-26T10:00:00.000Z,E4:AA:EA:56:4B:3F,,infra,,2,0,?,?,?,False,1,,wpa2,US,MA,Revere Street,,442,02152
42.3931694,-70.98334503,Flock-564F7F,0,20200824-00000,2020-08-23T17:00:00.000Z,2020-08-24T16:00:00.000Z,2022-08-26T10:00:00.000Z,E4:AA:EA:56:4F:7F,,infra,,2,0,?,?,?,False,6,,wpa2,US,MA,Crescent Avenue,Revere,293,02152
42.39696503,-71.06497955,Flock-969FB5,0,20220614-00000,2022-06-14T10:00:00.000Z,2022-06-14T11:00:00.000Z,2022-06-14T14:00:00.000Z,14:5A:FC:96:9F:B5,,infra,,2,0,?,?,?,False,40,,wpa2,US,MA,Broadway,,100,02149
42.41411209,-82.94161987,Flock-6235BF,0,20210404-00000,2021-04-03T14:00:00.000Z,2021-04-04T11:00:00.000Z,2022-07-05T01:00:00.000Z,00:F4:8D:62:35:BF,,infra,,2,0,?,?,?,False,11,,wpa2,US,MI,East Edsel Ford Freeway,Detroit,,48224
42.4185791,-71.04537201,Flock-969A21,0,20220614-00000,2022-06-14T13:00:00.000Z,2022-06-14T11:00:00.000Z,2022-06-14T14:00:00.000Z,14:5A:FC:96:9A:21,,infra,,2,0,?,?,?,False,36,,wpa2,US,MA,Broadway,,840;842,02149-3199
42.41942978,-82.93334198,Flock-47E1E3,0,20191202-00000,2019-09-17T16:00:00.000Z,2019-12-02T07:00:00.000Z,2022-07-05T01:00:00.000Z,B8:27:EB:47:E1:E3,,infra,,2,0,?,?,?,False,7,,wpa2,US,MI,East Edsel Ford Freeway,Detroit,,48225
42.45223618,-82.98575592,Flock-7EBF51,0,20220501-00000,2022-05-01T14:00:00.000Z,2022-05-01T16:00:00.000Z,2022-05-01T17:00:00.000Z,74:4C:A1:7E:BF:51,,infra,,2,0,?,?,?,False,11,,wpa2,US,MI,Schoenherr Road,Warren,21048,48089
42.53615189,-83.04868317,Flock-8931A5,0,20220723-00000,2022-07-23T15:00:00.000Z,2022-07-23T14:00:00.000Z,2022-07-23T16:00:00.000Z,74:4C:A1:89:31:A5,,infra,,2,0,?,?,?,False,48,,wpa2,US,MI,East 14 Mile Road,Sterling Heights,,48312
42.5519371,-83.02873993,Flock-898687,0,20220513-00000,2022-05-13T09:00:00.000Z,2022-05-13T07:00:00.000Z,2022-05-13T07:00:00.000Z,74:4C:A1:89:86:87,,infra,,2,0,?,?,?,False,48,,wpa2,US,MI,Van Dyke Avenue,,35214,48312
42.66056061,-73.72277069,Flock-7DCE99,0,20220503-00000,2022-05-03T17:00:00.000Z,2022-05-03T16:00:00.000Z,2022-05-03T16:00:00.000Z,D8:F3:BC:7D:CE:99,,infra,,2,0,?,?,?,False,1,,wpa2,US,NY,I 90,,,12144
42.7395134,-73.68218231,Flock-7DC309,0,20210809-00000,2021-08-09T11:00:00.000Z,2021-08-09T09:00:00.000Z,2022-08-22T16:00:00.000Z,D8:F3:BC:7D:C3:09,,infra,,2,0,?,?,?,False,6,,wpa2,US,NY,I 787;NY 7,City of Troy,,12183
42.73960114,-73.68125916,Flock-7DBB55,2,20210809-00000,2021-08-09T11:00:00.000Z,2021-08-15T12:00:00.000Z,2022-08-22T16:00:00.000Z,D8:F3:BC:7D:BB:55,,infra,,2,0,?,?,?,False,1,,wpa2,US,NY,Hoosick Street,City of Troy,90,12180
42.77142715,-73.68047333,Flock-3D12C1,0,20211101-00000,2021-11-01T12:00:00.000Z,2021-11-01T12:00:00.000Z,2021-11-01T12:00:00.000Z,D8:F3:BC:3D:12:C1,,infra,,2,0,?,?,?,False,1,,wpa2,US,NY,112th Street,,,12182
42.91296005,-85.53047943,Flock-8983EB,0,20220506-00000,2022-05-06T18:00:00.000Z,2022-05-06T16:00:00.000Z,2022-05-06T16:00:00.000Z,74:4C:A1:89:83:EB,,infra,,2,0,?,?,?,False,11,,wpa2,US,MI,28th Street Southeast,,5570,49512-2049
43.16898727,-88.10414124,Flock-892A75,0,20211115-00000,2021-11-13T17:00:00.000Z,2021-11-15T15:00:00.000Z,2021-11-15T15:00:00.000Z,74:4C:A1:89:2A:75,,infra,,2,0,?,?,?,False,6,,wpa2,US,WI,Pilgrim Road,,,53051
43.19212723,-88.14125824,Flock-7EBC59,0,20220519-00000,2022-05-19T11:00:00.000Z,2022-05-19T10:00:00.000Z,2022-05-19T10:00:00.000Z,74:4C:A1:7E:BC:59,,infra,,2,0,?,?,?,False,48,,wpa2,US,WI,County Line Road,,,53022
43.22149658,-87.92171478,Flock-898A4D,0,20220507-00000,2022-05-07T13:00:00.000Z,2022-05-07T13:00:00.000Z,2022-05-07T13:00:00.000Z,74:4C:A1:89:8A:4D,,infra,,2,0,?,?,?,False,1,,wpa2,US,WI,I 43;WI 32,,,53092
43.32027435,-87.92230988,Flock-3D0F39,0,20211017-00000,2021-10-16T11:00:00.000Z,2021-10-17T07:00:00.000Z,2021-10-17T07:00:00.000Z,D8:F3:BC:3D:0F:39,,infra,,2,0,?,?,?,False,6,,wpa2,US,WI,Washington Street,,,53024
43.48378754,-88.81547546,Flock-6FDF73,0,20220514-00000,2022-05-14T10:00:00.000Z,2022-05-14T09:00:00.000Z,2022-05-14T09:00:00.000Z,14:5A:FC:6F:DF:73,,infra,,2,0,?,?,?,False,149,,wpa2,US,WI,US 151,,,53916
44.25956345,-88.40710449,Flock-91EF7F,0,20220814-00000,2022-08-14T02:00:00.000Z,2022-08-14T01:00:00.000Z,2022-08-14T02:00:00.000Z,14:5A:FC:91:EF:7F,,infra,,2,0,?,?,?,False,161,,wpa2,US,WI,South Oneida Street,Appleton,,54911-5570
44.5568924,-123.284729,Flock-FEDCBA,7,20210921-00000,2021-09-21T16:00:00.000Z,2024-01-28T18:00:00.000Z,2024-01-28T19:00:00.000Z,E6:F4:C6:1D:7A:55,,infra,,2,0,?,?,?,False,8,0,wpa2,US,OR,Southwest Western Boulevard,Corvallis,2990,97333
44.55753326,-123.2793808,Flock-A1B2C3,7,20210921-00000,2021-09-21T16:00:00.000Z,2023-06-19T19:00:00.000Z,2023-06-19T20:00:00.000Z,E4:C3:2A:6C:1A:BE,,infra,,2,0,?,?,?,False,3,,wpa2,US,OR,Southwest 26th Street,Corvallis,,97331
45.05672836,-92.80770111,Flock-564D2F,0,20210619-00000,2021-06-19T16:00:00.000Z,2021-06-19T14:00:00.000Z,2022-07-31T18:00:00.000Z,E4:AA:EA:56:4D:2F,,infra,,2,0,?,?,?,False,6,,wpa2,US,MN,2nd Street North,,102,55082
47.67039871,-122.12779999,Flock-7DCBD9,0,20220405-00000,2022-03-10T09:00:00.000Z,2022-04-05T12:00:00.000Z,2022-04-05T12:00:00.000Z,D8:F3:BC:7D:CB:D9,,infra,,2,0,?,?,?,False,11,,wpa2,US,WA,Marymoor Connector Trail,,,98052-6800
61.49433899,23.77464485,Flock-123456,1,20230524-00000,2023-05-23T18:00:00.000Z,2023-09-15T08:00:00.000Z,2023-09-15T08:00:00.000Z,86:A2:F4:35:75:12,,infra,,2,0,?,?,?,False,1,,wpa2,FI,Manner-Suomi,Ratapihankatu,Tampere,,33100
61.49438858,23.7751503,Flock-123456,3,20240131-00000,2024-01-31T10:00:00.000Z,2024-04-05T05:00:00.000Z,2024-04-05T05:00:00.000Z,A6:A2:F4:35:75:12,,infra,,2,0,?,?,?,False,1,0,wpa2,FI,Manner-Suomi,Kalevantie,Tampere,2,33100
61.49453735,23.77475548,Flock-123456,7,20230515-00000,2023-05-15T08:00:00.000Z,2024-05-04T07:00:00.000Z,2024-05-04T08:00:00.000Z,A6:A2:F4:A9:1D:D4,,infra,,2,0,?,?,?,False,6,0,wpa2,FI,Manner-Suomi,Ratapihankatu,Tampere,,33100
61.49461746,23.77454567,Flock-123456,1,20240205-00000,2024-02-05T13:00:00.000Z,2024-03-22T06:00:00.000Z,2024-03-22T06:00:00.000Z,A2:A2:F4:35:75:13,,infra,,2,0,?,?,?,False,40,0,wpa2,FI,Manner-Suomi,Ratapihankatu,Tampere,,33100
61.49462891,23.7765274,Flock-23AB29,0,20240107-00000,2024-01-08T04:00:00.000Z,2024-01-07T21:00:00.000Z,2024-01-07T21:00:00.000Z,92:B7:DD:D9:9C:8B,,infra,,2,0,?,?,?,False,6,,wpa2,FI,Manner-Suomi,Kanslerinrinne,Tampere,,33100
61.49478149,23.7746582,Flock-123456,0,20240205-00000,2024-02-05T13:00:00.000Z,2024-02-05T06:00:00.000Z,2024-02-05T06:00:00.000Z,A2:A2:F4:A9:1D:D5,,infra,,2,0,?,?,?,False,36,0,wpa2,FI,Manner-Suomi,Ratapihankatu,Tampere,,33100
```

---

## 3. FS Ext Battery BLE Dataset Extractions

Source: `datasets/FS+Ext+Battery_20240530_105846.csv` (4,906 data rows, captured 2024-05-30)

All entries have `ssid="FS Ext Battery"`, `type=BLE` or `BT`.

### 3.1 Unique OUI Prefixes

Note: FS Ext Battery devices expose a fixed BLE MAC (not randomized). These OUIs are stable hardware identifiers.

```
1b:bd:af 1
b4:e3:f9 408
f7:0f:12 1
58:8e:81 1171
04:0d:84 351
38:5b:44 25
ec:1b:bd 1595
90:35:ea 728
cc:d4:cc 1
fa:35:a2 1
e0:38:2e 1
90:35:86 1
cc:cc:ac 1
58:8e:87 1
f0:82:c0 122
94:34:69 37
cc:cc:cc 415
1c:34:f1 47
```

Cross-reference with firmware OUI list:

- `58:8e:81` — IN firmware list
- `90:35:ea` — IN firmware list
- `ec:1b:bd` — IN firmware list
- `04:0d:84`, `1b:bd:af`, `1c:34:f1`, `38:5b:44`, `58:8e:87`, `90:35:86`, `94:34:69`, `b4:e3:f9`, `cc:cc:ac`, `cc:cc:cc`, `cc:d4:cc`, `e0:38:2e`, `f0:82:c0`, `f7:0f:12`, `fa:35:a2` — NOT in firmware WiFi list; BLE-only OUIs for the external battery hardware variant

### 3.2 Unique mfgrId Values

```
2955
1447.0 1
7936 1490
0 460
3.0 1
```

Decoded:

- `0` — no manufacturer data or unknown
- `1447.0` = 0x05A7 — Flock Safety manufacturer ID (BLE manufacturer specific data)
- `3.0` = 0x0003 — manufacturer ID 0x0003; low value, use conjunction with SSID to avoid false positives
- `7936` = 0x1F00 — WiGLE BT device class field (not a mfgrId)

### 3.3 Unique device Field Values

```
False 1950
0 2023
7936 934
```

- `0` — BLE device class 0 (standard BLE peripheral)
- `7936` / `0x1F00` — Bluetooth device class 0x1F00 (uncategorized)
- `False` — WiGLE BLE scan artifact

---

## 4. Penguin (Raven Acoustic Sensor) BLE Dataset Extractions

Source: `datasets/Penguin-___________20240530_111436.csv` (17,409 data rows, captured 2024-05-30)

All entries have SSID pattern `Penguin-NNNNNNNNNN` where N is a 10-digit decimal serial number, e.g. `Penguin-3101300881`. Type = `BLE` or `BT`.

### 4.1 SSID / Device Name Pattern

```
Penguin-<10-digit-serial>
```

The serial number is the same value readable from the Raven BLE `Serial Number` characteristic (service `0000180a`, char `00003002`).

### 4.2 BLE MAC Addressing — Critical Finding

Raven (Penguin) devices use **randomized BLE MAC addresses**. The OUI of the advertised address changes per scan session.

```
17372 unique OUI prefixes across 17410 rows
```

OUI-based matching is **not applicable** to Penguin/Raven detection. `mfgrId=2504` is the sole reliable passive identifier.

### 4.3 Unique mfgrId Values

```
5496
76.0 1
7936 4251
0 3586
2504.0 4076
```

Decoded:

- `0` — no manufacturer data
- `2504.0` = **0x09C8 (XUNTONG)** — Flock Safety manufacturer ID; the definitive Raven/Penguin identifier
- `76.0` = 0x004C — Apple Inc.; false positives from nearby iPhones/Macs
- `7936` = 0x1F00 — WiGLE BT device class field (not a manufacturer ID)

### 4.4 Unique device Field Values

```
False 7837
0 7580
7936 1993
```

---

## 5. Raven BLE Service Characteristics

Source: `datasets/raven_configurations.json`

Three firmware versions documented: 1.1.7, 1.2.0, 1.3.1.

```json
[
  {
    "firmwareVersion": "1.1.7",
    "characteristics": [
      {
        "name": "Serial Number",
        "serviceUuid": "0000180a-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00002a25-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Model Number",
        "serviceUuid": "0000180a-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00002a24-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Firmware Version",
        "serviceUuid": "0000180a-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00002a26-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "HTTP Status Code",
        "serviceUuid": "0000180a-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "0002AB8-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Reconnect Address",
        "serviceUuid": "0000180a-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00002a03-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Temperature",
        "serviceUuid": "00001809-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00002A6E-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Sensor Location",
        "serviceUuid": "00001809-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00002A5D-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Battery Level",
        "serviceUuid": "00001809-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00002A19-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "TX Power Level",
        "serviceUuid": "00001809-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00002A07-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Latitude",
        "serviceUuid": "00001819-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00002AAE-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Longitude",
        "serviceUuid": "00001819-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00002AAF-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Altitude",
        "serviceUuid": "00001819-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00002AB3-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      }
    ]
  },
  {
    "firmwareVersion": "1.2.0",
    "characteristics": [
      {
        "name": "Part Number",
        "serviceUuid": "0000180a-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003001-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Serial Number",
        "serviceUuid": "0000180a-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003002-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Firmware Version",
        "serviceUuid": "0000180a-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00002a26-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "MAC Address",
        "serviceUuid": "0000180a-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003004-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "GPS Latitude",
        "serviceUuid": "00003100-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003101-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "GPS Longitude",
        "serviceUuid": "00003100-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003102-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "GPS Altitude",
        "serviceUuid": "00003100-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003103-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Board Temperature",
        "serviceUuid": "00003200-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003201-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Battery Voltage",
        "serviceUuid": "00003200-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003202-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Charge/Discharge Current",
        "serviceUuid": "00003200-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003203-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "10 W Solar Voltage",
        "serviceUuid": "00003200-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003204-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Last Connected",
        "serviceUuid": "00003300-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003301-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "LTE Network Type",
        "serviceUuid": "00003300-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003302-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "LTE Operator",
        "serviceUuid": "00003300-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003303-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "LTE RSSI",
        "serviceUuid": "00003300-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003304-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "LTE RSRQ",
        "serviceUuid": "00003300-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003305-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "LTE RSRP",
        "serviceUuid": "00003300-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003306-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "LTE SINR",
        "serviceUuid": "00003300-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003307-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Last Connected WiFi SSID",
        "serviceUuid": "00003300-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003308-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "WiFi RSSI",
        "serviceUuid": "00003300-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003309-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Network Connection Status",
        "serviceUuid": "00003300-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "0000330A-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Average Upload Time",
        "serviceUuid": "00003400-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003401-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Most Recent Upload Time",
        "serviceUuid": "00003400-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003402-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Number of Audio Uploads Since Boot",
        "serviceUuid": "00003400-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003403-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Identity Check Failures",
        "serviceUuid": "00003500-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003501-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Status Update Failures",
        "serviceUuid": "00003500-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003502-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Heartbeat Failures",
        "serviceUuid": "00003500-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003503-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "OTA Update Failures",
        "serviceUuid": "00003500-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003504-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Audio Upload Failures",
        "serviceUuid": "00003500-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003505-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      }
    ]
  },
  {
    "firmwareVersion": "1.3.1",
    "characteristics": [
      {
        "name": "Part Number",
        "serviceUuid": "0000180a-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003001-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Serial Number",
        "serviceUuid": "0000180a-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003002-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Firmware Version",
        "serviceUuid": "0000180a-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00002a26-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "MAC Address",
        "serviceUuid": "0000180a-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003004-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "GPS Latitude",
        "serviceUuid": "00003100-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003101-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "GPS Longitude",
        "serviceUuid": "00003100-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003102-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "GPS Altitude",
        "serviceUuid": "00003100-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003103-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Board Temperature",
        "serviceUuid": "00003200-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003201-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Battery Voltage",
        "serviceUuid": "00003200-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003202-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Charge/Discharge Current",
        "serviceUuid": "00003200-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003203-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "10 W Solar Voltage",
        "serviceUuid": "00003200-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003204-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Battery State",
        "serviceUuid": "00003200-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003205-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Last Connected",
        "serviceUuid": "00003300-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003301-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "LTE Network Type",
        "serviceUuid": "00003300-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003302-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "LTE Operator",
        "serviceUuid": "00003300-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003303-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "LTE RSSI",
        "serviceUuid": "00003300-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003304-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "LTE RSRQ",
        "serviceUuid": "00003300-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003305-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "LTE RSRP",
        "serviceUuid": "00003300-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003306-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "LTE SINR",
        "serviceUuid": "00003300-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003307-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Last Connected WiFi SSID",
        "serviceUuid": "00003300-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003308-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "WiFi RSSI",
        "serviceUuid": "00003300-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003309-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Network Connection Status",
        "serviceUuid": "00003300-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "0000330A-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Average Upload Time",
        "serviceUuid": "00003400-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003401-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Most Recent Upload Time",
        "serviceUuid": "00003400-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003402-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Number of Audio Uploads Since Boot",
        "serviceUuid": "00003400-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003403-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Identity Check Failures",
        "serviceUuid": "00003500-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003501-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Status Update Failures",
        "serviceUuid": "00003500-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003502-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Heartbeat Failures",
        "serviceUuid": "00003500-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003503-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "OTA Update Failures",
        "serviceUuid": "00003500-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003504-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      },
      {
        "name": "Audio Upload Failures",
        "serviceUuid": "00003500-0000-1000-8000-00805f9b34fb",
        "characteristicUuid": "00003505-0000-1000-8000-00805f9b34fb",
        "dataType": "string"
      }
    ]
  }
]
```

### 5.1 Service UUID Summary

| Service UUID   | Service Name                     | Firmware     |
| -------------- | -------------------------------- | ------------ |
| `0000180a-...` | Device Information               | All versions |
| `00001809-...` | Health Thermometer (repurposed)  | 1.1.7 only   |
| `00001819-...` | Location (standard BLE)          | 1.1.7 only   |
| `00003100-...` | GPS (custom Flock)               | 1.2.0+       |
| `00003200-...` | Power/Battery (custom Flock)     | 1.2.0+       |
| `00003300-...` | Network/LTE (custom Flock)       | 1.2.0+       |
| `00003400-...` | Upload Statistics (custom Flock) | 1.2.0+       |
| `00003500-...` | Error Counters (custom Flock)    | 1.2.0+       |

### 5.2 Key Characteristic UUIDs for Identification

| Characteristic UUID  | Name                     | Notes                                            |
| -------------------- | ------------------------ | ------------------------------------------------ |
| `00002a26-...`       | Firmware Version         | "1.1.7", "1.2.0", "1.3.1" — fingerprints version |
| `00003001-...`       | Part Number              | Hardware SKU identifier                          |
| `00003002-...`       | Serial Number            | Matches `Penguin-XXXXXXXXXX` suffix              |
| `00003004-...`       | MAC Address              | True hardware MAC even when BLE is randomized    |
| `00003101/02/03-...` | GPS Lat/Lon/Alt          | Live location of deployed sensor                 |
| `00003202-...`       | Battery Voltage          | Power state                                      |
| `00003302-...`       | LTE Network Type         | Carrier fingerprint                              |
| `00003308-...`       | Last Connected WiFi SSID | Will contain `Flock-XXXXXX` format SSID          |

### 5.3 Version Delta Notes

- v1.1.7 → v1.2.0: Replaced standard BLE health/location services with custom Flock UUIDs (0x3100–0x3500 range). `00001809` and `00001819` services dropped.
- v1.2.0 → v1.3.1: Added `Battery State` characteristic (UUID `00003205`). All other characteristics identical.

---

## 6. Shadowcheck Integration Opportunities

### 6.1 Signal Type Matrix

| Signal Type               | Identifier                                              | Source                       | Shadowcheck Data Source               | Notes                                                                             |
| ------------------------- | ------------------------------------------------------- | ---------------------------- | ------------------------------------- | --------------------------------------------------------------------------------- |
| WiFi OUI (addr2)          | 31 OUI prefixes                                         | NitekryDPaul + DeFlockJoplin | WiGLE v2, WiGLE v3, observations      | Primary active-transmitter signal                                                 |
| WiFi OUI (addr1)          | Same 31 prefixes                                        | NitekryDPaul                 | WiGLE v2, WiGLE v3                    | Catches sleeping cameras as destination; addr1 not in WiGLE                       |
| WiFi SSID — primary       | `^[Ff][Ll][Oo][Cc][Kk]-[0-9A-Fa-f]{6}$`                 | WiGLE dataset                | WiGLE v2, WiGLE v3, KML, observations | Case-insensitive; hex suffix = last 3 MAC octets                                  |
| WiFi SSID — test entries  | `Flock-123456`, `Flock-ABCDEF`                          | WiGLE dataset                | Exclude / filter                      | Synthetic test entries; not real deployments                                      |
| BLE mfgrId 0x09C8         | 2504 decimal                                            | Penguin CSV                  | BLE ingest                            | Sole reliable Raven/Penguin passive identifier                                    |
| BLE mfgrId 0x05A7         | 1447 decimal                                            | FS Ext Battery CSV           | BLE ingest                            | FS Ext Battery variant                                                            |
| BLE device name — Raven   | `^Penguin-\d{10}$`                                      | Penguin CSV                  | BLE ingest, observations              | 10-digit decimal serial; matches Serial Number characteristic                     |
| BLE device name — battery | `^FS Ext Battery$`                                      | FS Ext Battery CSV           | BLE ingest, observations              | Exact string                                                                      |
| BLE service UUID          | `00003100-0000-1000-8000-00805f9b34fb` (custom GPS)     | raven_configurations.json    | BLE ingest                            | Flock-custom UUID; unique fingerprint                                             |
| BLE service UUID          | `00003200-0000-1000-8000-00805f9b34fb` (custom power)   | raven_configurations.json    | BLE ingest                            | Flock-custom UUID; unique fingerprint                                             |
| BLE service UUID          | `00003300-0000-1000-8000-00805f9b34fb` (custom network) | raven_configurations.json    | BLE ingest                            | Flock-custom UUID; unique fingerprint                                             |
| BLE service UUID          | `00003400-0000-1000-8000-00805f9b34fb` (upload stats)   | raven_configurations.json    | BLE ingest                            | Flock-custom UUID; unique fingerprint                                             |
| BLE service UUID          | `00003500-0000-1000-8000-00805f9b34fb` (error counters) | raven_configurations.json    | BLE ingest                            | Flock-custom UUID; unique fingerprint                                             |
| BLE characteristic read   | `00003308` → SSID value                                 | raven_configurations.json    | BLE ingest (active)                   | `Last Connected WiFi SSID` will contain `Flock-XXXXXX`; requires active GATT read |
| Firmware version string   | `"1.1.7"`, `"1.2.0"`, `"1.3.1"`                         | raven_configurations.json    | BLE ingest (active)                   | From char `00002a26` under service `0000180a`                                     |
| Wildcard Probe Request    | 802.11 mgmt type=0 sub=4, SSID IE length=0              | DeFlockJoplin field test     | —                                     | Passive over-the-air only; not in WiGLE schema                                    |

### 6.2 WiGLE v2 / v3 Integration Notes

- **SSID regex match:** `^(Flock|FLOCK)-[0-9A-Fa-f]{6}$` applied to WiGLE `ssid` field gives high-confidence WiFi camera sightings.
- **OUI prefix filter:** The 31 OUIs can be applied to WiGLE `netid` (MAC) field after stripping the last 3 octets. Confirmed effective: 25 of 26 unique OUIs in the WiGLE data match the firmware list.
- **`b8:27:eb` exclusion:** Raspberry Pi OUI appears in the Flock WiGLE data (25 sightings) due to early prototype hardware. Recommend excluding or requiring SSID match confirmation.
- **`e0:0a:f6` candidate:** 8 sightings, not in current list, not locally-administered. Potential 32nd OUI for future addition.
- **Encryption filter:** All real Flock cameras use `wpa2`. Entries with `wep` encryption are likely misidentifications.
- **Type anomaly:** One entry (`9C:2F:9D:6F:42:25`, Capital Beltway VA) has `type=tods` instead of `infra`. WiGLE artifact; treat as `infra`.

### 6.3 BLE Ingest Integration Notes

- **Primary Raven filter:** `mfgrId == 2504` (0x09C8). Confirmed across 17,409-row WiGLE BLE dataset. Apple mfgrId 76 (0x004C) will not match.
- **FS Ext Battery filter:** `ssid == "FS Ext Battery"` OR `mfgrId == 1447`. Avoid using `mfgrId=3` alone — it is too common a value.
- **Raven device name filter:** `ssid LIKE 'Penguin-%'` with 10-digit numeric suffix validation.
- **Custom service UUID fingerprint:** Any of `00003100`, `00003200`, `00003300`, `00003400`, `00003500` (with standard base UUID suffix) uniquely identifies Flock/Raven hardware in a BLE service advertisement scan. These UUIDs are not assigned to any other known vendor in the Bluetooth SIG registry.
- **MAC randomization:** Raven uses randomized BLE MACs. Do not use MAC/OUI for BLE Raven matching. Use mfgrId or device name or service UUID.

### 6.4 KML / Observations Integration Notes

- KML exports from WiGLE contain lat/lon + SSID. The SSID regex above applies directly.
- Observations with `device_name` field: match `^Penguin-\d{10}$` for Raven acoustic sensors.
- Co-location: Raven sensors are typically deployed within ~50 meters of a Flock ALPR camera. A Raven BLE sighting and a Flock WiFi SSID within the same geographic cluster is high-confidence infrastructure detection.

// Normalized fleet SSIDs — independent devices sharing a broadcast name, not siblings.
// Values are lowercase with non-alphanumeric chars stripped (matching the SQL normalization).
// Applied to: ssid_anchor, ssid_exact_sequential, cross_oui_ssid_exact, REFRESH_CHUNK_SQL scoring.
const FLEET_SSIDS = [
  'greatlakesmobile',
  'mdt',
  'mtasmartbus',
  'kajeetsmartbus',
  'xfinitywifi',
  'xfinity',
  'xfinitymobile',
  'eduroam',
  'attwifi',
  'optimumwifi',
  'cablewifi',
  'spectrumwifi',
  'twcwifi',
  'boingohotspot',
  'boingowireless',
  'googlesb',
  '_google',
  'hurleyguest',
  'hmcpsk',
  'hmcbio',
  'hmcguest',
  'mguest',
  'mflint',
  'masimo',
  'ppm',
  'somiot',
  'somguest',
  'seos',
  'paxar',
  'mychevrolet',
  'onstar',
  'mybuick',
  'mycadillac',
  'mygmc',
  'lebosecoloriisoundlink',
  'fact',
  'ccguest',
  'ccinternal',
  'pasrig',
  'msamobile',
  'lapeeremsmobile',
  'msetup',
  'hiltonhonors',
  'meijervendor',
  'meijerwifi',
  'meijercorp',
  'meijerconnect',
  'red5',
  'mprotek',
  'msunet',
  'msunetguest',
  'msuchm',
  'regentswireless',
  'dpssregents',
  'costcomemberwifi',
  'cvwifi',
  'cwifi',
  'mott',
] as const;

const FLEET_SSID_SQL_LIST = FLEET_SSIDS.map((s) => `'${s}'`).join(',');

/** Sibling detection operational defaults */
const SIBLING_DETECTION_DEFAULTS = {
  BATCH_SIZE: 50,
  MAX_OCTET_DELTA: 6,
  MAX_DISTANCE_M: 1500,
  CONFIDENCE_THRESHOLD: 0.9,
} as const;

/** Sibling scoring tuning parameters */
const SIBLING_SCORING = {
  SSID_FUZZY_MATCH_BONUS: 0.07,

  // Penalties for radios with too many "common" partners (fleet behavior)
  PARTNER_PENALTY_COUNTS: [12, 8, 5, 3],
  PARTNER_PENALTY_VALUES: [0.55, 0.4, 0.25, 0.12],

  // Penalties for SSIDs with too many distinct radios (fleet behavior)
  FAMILY_PENALTY_COUNTS: [18, 10, 6],
  FAMILY_PENALTY_VALUES: [0.25, 0.15, 0.08],
} as const;

export { FLEET_SSIDS, FLEET_SSID_SQL_LIST, SIBLING_DETECTION_DEFAULTS, SIBLING_SCORING };

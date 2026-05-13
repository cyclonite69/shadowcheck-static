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
] as const;

const FLEET_SSID_SQL_LIST = FLEET_SSIDS.map((s) => `'${s}'`).join(',');

export { FLEET_SSIDS, FLEET_SSID_SQL_LIST };

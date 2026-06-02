import vendorManifest from '../components/vendor-intel/vendor_intel_manifest.json';

const DEVICE_CLASS_LABELS: Record<string, string> = {
  FLOCK_SAFETY_CAMERA: 'Flock Safety Camera',
  FS_EXT_BATTERY: 'Flock External Battery',
  SHOTSPOTTER_SENSOR: 'ShotSpotter Sensor',
  AXON_BODY_CAMERA: 'Axon Body Camera',
  MOTOROLA_BWC: 'Motorola Body Camera',
  AXON_SIGNAL_PERIPHERAL: 'Axon Signal Peripheral',
  DEI_BWC: 'Body Worn Camera (DEI)',
  BT_IMAGING_DEVICE: 'BT Imaging Device',
  RAVEN_GUNSHOT_DETECTOR: 'Raven Gunshot Detector',
  L3HARRIS_STINGRAY: 'L3Harris StingRay',
  RAYTHEON_ESYSTEMS: 'Raytheon E-Systems',
  VERINT_INTERCEPT: 'Verint Intercept',
  VERINT_LORONIX: 'Verint Loronix',
  SEPTIER_WIFICATCHER: 'Septier WiFi Catcher',
  ABILITY_INTERCEPT: 'Ability Intercept',
  ROHDE_SCHWARZ_WLAN: 'Rohde & Schwarz WLAN',
  COBHAM_SIGINT: 'Cobham SIGINT',
  NORSAT_SATCOM: 'Norsat Satcom',
  GENERAL_DYNAMICS_C4ISR: 'General Dynamics C4ISR',
  NORTHROP_GRUMMAN_ISR: 'Northrop Grumman ISR',
  LEONARDO_DRS_TACTICAL: 'Leonardo DRS Tactical',
  TADIRAN_COMMS: 'Tadiran Communications',
  PRIVATE_OUI_REGISTERED: 'Private OUI Registered',
  UBIQUITI_MESH: 'Ubiquiti Mesh',
  CAMBIUM_BACKHAUL: 'Cambium Backhaul',
  PROXIM_SURVEILLANCE: 'Proxim Surveillance',
  PEPLINK_MOBILEPOST: 'Peplink Mobile Post',
};

const VENDOR_INTEL_DEVICE_CLASSES = new Set(
  (vendorManifest.vendors as Array<{ surveillance_type?: string }>)
    .map((vendor) => normalizeDeviceClass(vendor.surveillance_type))
    .filter((value): value is string => value !== null)
);

const prettifyEnum = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

export function normalizeDeviceClass(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const normalized = String(raw).trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

export function formatDeviceType(raw: string | null | undefined): string {
  const deviceClass = normalizeDeviceClass(raw);
  if (!deviceClass) return '';
  return DEVICE_CLASS_LABELS[deviceClass] ?? prettifyEnum(deviceClass);
}

export function hasVendorIntelForDeviceClass(deviceClass: string | null | undefined): boolean {
  const normalized = normalizeDeviceClass(deviceClass);
  return normalized ? VENDOR_INTEL_DEVICE_CLASSES.has(normalized) : false;
}

/**
 * Format WiFi security capabilities into readable labels
 */

/**
 * Format security capabilities string into readable label
 * @param capabilities - Raw security/encryption string from WiGLE
 * @returns Human-readable security label
 */
export const formatSecurity = (capabilities: string | null | undefined): string => {
  const value = String(capabilities || '').toUpperCase();

  if (!value || value === 'UNKNOWN' || value === 'OPEN/UNKNOWN' || value === 'NONE') {
    return 'Open';
  }

  const hasWpa3 = value.includes('WPA3');
  const hasWpa2 = value.includes('WPA2');
  const hasWpa = value.includes('WPA');
  const hasWep = value.includes('WEP');
  const hasPsk = value.includes('PSK');
  const hasEap = value.includes('EAP');
  const hasSae = value.includes('SAE');
  const hasOwe = value.includes('OWE');

  if (hasOwe) return 'OWE';
  if (hasWpa3 && hasSae) return 'WPA3-SAE';
  if (hasWpa3 && hasEap) return 'WPA3-EAP';
  if (hasWpa3) return 'WPA3';
  if (hasWpa2 && hasEap) return 'WPA2-EAP';
  if (hasWpa2 && hasPsk) return 'WPA2-PSK';
  if (hasWpa2) return 'WPA2';
  if (hasWpa && hasEap) return 'WPA-EAP';
  if (hasWpa && hasPsk) return 'WPA-PSK';
  if (hasWpa) return 'WPA';
  if (hasWep) return 'WEP';

  return 'Open';
};

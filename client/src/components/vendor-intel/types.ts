/** Shared manifest types for the Device Intel Library. */

export type SourceType =
  | 'leaked'
  | 'foia'
  | 'manufacturer'
  | 'public'
  | 'research'
  | 'procurement'
  | 'fcc';

export interface VendorDoc {
  title: string;
  source_type: SourceType;
  format: 'html' | 'pdf';
  file: string;
  summary: string;
  year: number;
  origin: string;
}

export interface VendorEntry {
  vendor_key: string;
  /** Canonical device class key — matches DEVICE_CLASS_LABELS. */
  device_class?: string;
  /** Top-level taxonomy category. */
  category?: string;
  group_label?: string;
  display_name: string;
  oui_prefixes: string[];
  /** Legacy SIGINT tier (1–3). Null for non-SIGINT entries; use severity instead. */
  threat_tier: 1 | 2 | 3 | null;
  /** CRITICAL | HIGH | MEDIUM | LOW | INFO — used when threat_tier is absent. */
  severity?: string;
  /** Join key into oui_device_groups and surveillance_detections. */
  surveillance_type: string;
  description: string;
  /** Signal types that can produce a detection match. */
  evidence_types?: string[];
  confidence_notes?: string;
  /** 'needs_collection' | 'partial' | 'not_applicable' | undefined (all docs present). */
  docs_status?: string;
  docs: VendorDoc[];
}

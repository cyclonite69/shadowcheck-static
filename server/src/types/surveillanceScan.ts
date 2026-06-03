export type SurveillanceScanDryRunResult = {
  dryRun: true;
  candidateCount: number;
  existingDetectionCount: number;
  summary: {
    insert: number;
    update: number;
    unchanged: number;
    skip_false_positive: number;
  };
  byDeviceType: Record<
    string,
    {
      insert: number;
      update: number;
      unchanged: number;
      skip_false_positive: number;
    }
  >;
  samples: Array<{
    bssid: string;
    ssid?: string | null;
    device_type: string;
    confidence: string | number;
    threat_score: number;
    detection_method: string;
    matched_signals: string[];
    action: 'insert' | 'update' | 'unchanged' | 'skip_false_positive';
    reason: string;
    existing?: {
      device_type: string;
      confidence: string | number;
      threat_score: number;
      detection_method: string;
      matched_signals: string[];
      false_positive: boolean;
    };
  }>;
};

import {
  scoreBehavioralThreats,
  toManualTagMap,
  toThreatLevel,
} from '../../../../server/src/services/backgroundJobs/mlBehavioralScoring';

describe('mlBehavioralScoring', () => {
  describe('toManualTagMap', () => {
    it('should convert tag rows to a map', () => {
      const tagRows: any[] = [
        { bssid: 'B1', threat_tag: 'THREAT', threat_confidence: 0.8, notes: 'n1' },
        { bssid: 'B2', threat_tag: 'FALSE_POSITIVE' }, // testing default confidence
      ];
      const map = toManualTagMap(tagRows);
      expect(map.size).toBe(2);
      expect(map.get('B1')).toEqual({ tag: 'THREAT', confidence: 0.8, notes: 'n1' });
      expect(map.get('B2')).toEqual({ tag: 'FALSE_POSITIVE', confidence: 1.0, notes: undefined });
    });
  });

  describe('toThreatLevel', () => {
    it('should return correct threat levels based on scores', () => {
      expect(toThreatLevel(85)).toBe('CRITICAL');
      expect(toThreatLevel(80)).toBe('CRITICAL');
      expect(toThreatLevel(70)).toBe('HIGH');
      expect(toThreatLevel(60)).toBe('HIGH');
      expect(toThreatLevel(50)).toBe('MED');
      expect(toThreatLevel(40)).toBe('MED');
      expect(toThreatLevel(30)).toBe('LOW');
      expect(toThreatLevel(20)).toBe('LOW');
      expect(toThreatLevel(10)).toBe('NONE');
    });
  });

  describe('scoreBehavioralThreats', () => {
    it('should score networks correctly with mobility and persistence', () => {
      const networks: any[] = [
        { bssid: 'HIGH', maxDistanceKm: 6, uniqueDays: 8 },
        { bssid: 'MED', maxDistanceKm: 2, uniqueDays: 4 },
        { bssid: 'LOW', maxDistanceKm: 0.5, uniqueDays: 1 },
      ];

      const { scores } = scoreBehavioralThreats(networks, []);

      const high = scores.find((s) => s.bssid === 'HIGH');
      // mobility: 6 > 5 => 80
      // persistence: 8 > 7 => 60
      // score: 80 * 0.6 + 60 * 0.4 = 48 + 24 = 72
      expect(high?.ml_threat_score).toBe(72);
      expect(high?.ml_primary_class).toBe('THREAT');
      expect(high?.final_threat_level).toBe('HIGH');

      const med = scores.find((s) => s.bssid === 'MED');
      // mobility: 2 > 1 => 40
      // persistence: 4 > 3 => 30
      // score: 40 * 0.6 + 30 * 0.4 = 24 + 12 = 36
      expect(med?.ml_threat_score).toBe(36);
      expect(med?.ml_primary_class).toBe('LEGITIMATE');
      expect(med?.final_threat_level).toBe('LOW');

      const low = scores.find((s) => s.bssid === 'LOW');
      // mobility: 0.5 < 1 => 0
      // persistence: 1 < 3 => 0
      // score: 0
      expect(low?.ml_threat_score).toBe(0);
      expect(low?.final_threat_level).toBe('NONE');
    });

    it('should handle legacy field names', () => {
      const networks: any[] = [{ bssid: 'LEGACY', max_distance_km: 6, unique_days: 8 }];
      const { scores } = scoreBehavioralThreats(networks, []);
      expect(scores[0].ml_threat_score).toBe(72);
    });

    it('should handle missing fields with defaults', () => {
      const networks: any[] = [{ bssid: 'MISSING' }];
      const { scores } = scoreBehavioralThreats(networks, []);
      expect(scores[0].ml_threat_score).toBe(0);
    });

    it('should apply feedback multipliers', () => {
      const networks: any[] = [
        { bssid: 'FP', maxDistanceKm: 6, uniqueDays: 8 },
        { bssid: 'THREAT_BOOST', maxDistanceKm: 6, uniqueDays: 8 },
        { bssid: 'SUSPECT_BOOST', maxDistanceKm: 6, uniqueDays: 8 },
        { bssid: 'INVESTIGATE', maxDistanceKm: 6, uniqueDays: 8 },
      ];
      const tags: any[] = [
        { bssid: 'FP', threat_tag: 'FALSE_POSITIVE' },
        { bssid: 'THREAT_BOOST', threat_tag: 'THREAT', threat_confidence: 0.5 },
        { bssid: 'SUSPECT_BOOST', threat_tag: 'SUSPECT', threat_confidence: 0.5 },
        { bssid: 'INVESTIGATE', threat_tag: 'INVESTIGATE' },
      ];

      const { scores } = scoreBehavioralThreats(networks, tags);
      const baseScore = 72;

      const fp = scores.find((s) => s.bssid === 'FP');
      expect(fp?.final_threat_score).toBeCloseTo(baseScore * 0.1);
      expect(fp?.feedback_applied).toBe(true);

      const tb = scores.find((s) => s.bssid === 'THREAT_BOOST');
      // boost: 1.0 + 0.5 * 0.3 = 1.15
      expect(tb?.final_threat_score).toBeCloseTo(baseScore * 1.15);

      const sb = scores.find((s) => s.bssid === 'SUSPECT_BOOST');
      // boost: 1.0 + 0.5 * 0.15 = 1.075
      expect(sb?.final_threat_score).toBeCloseTo(baseScore * 1.075);

      const inv = scores.find((s) => s.bssid === 'INVESTIGATE');
      expect(inv?.final_threat_score).toBe(baseScore);
    });
  });
});

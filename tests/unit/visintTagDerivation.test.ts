import { deriveVisintTags } from '../../server/src/services/visint/visintPipeline';

describe('deriveVisintTags', () => {
  // ─── Sentinel / unmatched fallback ────────────────────────────────────────
  describe('VISINT_UNMATCHED sentinel (fallback path)', () => {
    it('returns UNMATCHED_NODE + VISINT_UNMATCHED for sentinel BSSID regardless of score', () => {
      expect(deriveVisintTags('VISINT_UNMATCHED', 0, null, false)).toEqual([
        'UNMATCHED_NODE',
        'VISINT_UNMATCHED',
      ]);
    });

    it('returns UNMATCHED_NODE + VISINT_UNMATCHED even if manual_override is true on sentinel', () => {
      // Should never happen in practice, but sentinel BSSID always wins
      expect(deriveVisintTags('VISINT_UNMATCHED', 2, 'SHOTSPOTTER_SENSOR', true)).toEqual([
        'UNMATCHED_NODE',
        'VISINT_UNMATCHED',
      ]);
    });
  });

  // ─── Manual override — ground-truth evidence path ─────────────────────────
  describe('manual override to a real BSSID', () => {
    it('score-0 real candidate → confirmed/manual tags, NOT UNMATCHED_NODE', () => {
      const tags = deriveVisintTags('2C:58:4F:9D:31:68', 0, null, true);
      expect(tags).toContain('VISINT_MANUAL_MATCH');
      expect(tags).toContain('VISINT_CONFIRMED');
      expect(tags).toContain('GROUND_TRUTH_IMAGE');
      expect(tags).toContain('VISINT_SPATIAL_MATCH');
      expect(tags).not.toContain('UNMATCHED_NODE');
      expect(tags).not.toContain('VISINT_UNMATCHED');
    });

    it('manual ShotSpotter candidate gets SHOTSPOTTER_SENSOR + confirmed tags', () => {
      const tags = deriveVisintTags('60:3D:26:73:61:4A', 2, 'SHOTSPOTTER_SENSOR', true);
      expect(tags).toContain('SHOTSPOTTER_SENSOR');
      expect(tags).toContain('VISINT_MANUAL_MATCH');
      expect(tags).toContain('VISINT_CONFIRMED');
      expect(tags).toContain('GROUND_TRUTH_IMAGE');
      expect(tags).toContain('VISINT_SPATIAL_MATCH');
      expect(tags).not.toContain('UNMATCHED_NODE');
      expect(tags).not.toContain('VISINT_UNMATCHED');
    });

    it('manual Flock score-4 candidate gets FLOCK_NEW_FIRMWARE + confirmed tags', () => {
      const tags = deriveVisintTags('AA:BB:CC:DD:EE:01', 4, 'FLOCK_SAFETY_CAMERA', true);
      expect(tags).toContain('FLOCK_NEW_FIRMWARE');
      expect(tags).toContain('VISINT_MANUAL_MATCH');
      expect(tags).toContain('VISINT_CONFIRMED');
      expect(tags).not.toContain('UNMATCHED_NODE');
    });

    it('manual Flock score-3 candidate gets FLOCK_LEGACY', () => {
      const tags = deriveVisintTags('AA:BB:CC:DD:EE:02', 3, 'FLOCK_SAFETY_CAMERA', true);
      expect(tags).toContain('FLOCK_LEGACY');
    });

    it('manual Flock score-0 candidate gets FLOCK_CANDIDATE (fallback within Flock family)', () => {
      const tags = deriveVisintTags('AA:BB:CC:DD:EE:03', 0, 'FLOCK_SAFETY_CAMERA', true);
      expect(tags).toContain('FLOCK_CANDIDATE');
      expect(tags).not.toContain('UNMATCHED_NODE');
    });
  });

  // ─── Auto-matched paths — ShotSpotter ─────────────────────────────────────
  describe('auto-matched ShotSpotter (score ≥ 2)', () => {
    it('CBCI SSID pattern (score 2) → SHOTSPOTTER_SENSOR + VISINT_VERIFIED', () => {
      const tags = deriveVisintTags('60:3D:26:73:61:4A', 2, 'SHOTSPOTTER_SENSOR', false);
      expect(tags).toEqual(['SHOTSPOTTER_SENSOR', 'VISINT_VERIFIED']);
    });

    it('SoundThinking/ShotSpotter SSID (score 2) → SHOTSPOTTER_SENSOR + VISINT_VERIFIED', () => {
      const tags = deriveVisintTags('FC:51:A4:23:E0:A6', 2, 'SHOTSPOTTER_SENSOR', false);
      expect(tags).toEqual(['SHOTSPOTTER_SENSOR', 'VISINT_VERIFIED']);
    });

    it('ShotSpotter score 1 → SHOTSPOTTER_SENSOR + VISINT_PENDING', () => {
      const tags = deriveVisintTags('FC:51:A4:23:E0:A6', 1, 'SHOTSPOTTER_SENSOR', false);
      expect(tags).toEqual(['SHOTSPOTTER_SENSOR', 'VISINT_PENDING']);
    });
  });

  // ─── Auto-matched paths — Flock (existing behaviour unchanged) ────────────
  describe('auto-matched Flock (existing behaviour)', () => {
    it('Flock BLE UUID (score 4) → FLOCK_NEW_FIRMWARE + VISINT_VERIFIED', () => {
      const tags = deriveVisintTags('AA:BB:CC:DD:EE:01', 4, 'FLOCK_SAFETY_CAMERA', false);
      expect(tags).toEqual(['FLOCK_NEW_FIRMWARE', 'VISINT_VERIFIED']);
    });

    it('10-digit SSID (score 3) → FLOCK_LEGACY + VISINT_VERIFIED', () => {
      const tags = deriveVisintTags('AA:BB:CC:DD:EE:02', 3, 'FLOCK_SAFETY_CAMERA', false);
      expect(tags).toEqual(['FLOCK_LEGACY', 'VISINT_VERIFIED']);
    });

    it('BLE SSID=4 (score 1) → FLOCK_CANDIDATE + VISINT_PENDING', () => {
      const tags = deriveVisintTags('AA:BB:CC:DD:EE:03', 1, 'FLOCK_SAFETY_CAMERA', false);
      expect(tags).toEqual(['FLOCK_CANDIDATE', 'VISINT_PENDING']);
    });
  });

  // ─── Spatial-only (score 0, real BSSID, auto) ─────────────────────────────
  describe('spatial-only candidate (score 0, auto, real BSSID)', () => {
    it('returns VISINT_SPATIAL_MATCH, NOT UNMATCHED_NODE', () => {
      const tags = deriveVisintTags('2C:58:4F:9D:31:68', 0, null, false);
      expect(tags).toEqual(['VISINT_SPATIAL_MATCH']);
      expect(tags).not.toContain('UNMATCHED_NODE');
      expect(tags).not.toContain('VISINT_UNMATCHED');
    });
  });
});

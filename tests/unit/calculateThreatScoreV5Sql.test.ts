import fs from 'fs';
import path from 'path';

describe('calculate_threat_score_v5 SQL contract', () => {
  const sqlPath = path.resolve(__dirname, '../../sql/functions/calculate_threat_score_v5.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  it('separates public WiGLE bonus from LAN-local follow legs in components output', () => {
    expect(sql).toContain('public_pattern_bonus_raw AS (');
    expect(sql).toContain('public_pattern_bonus AS (');
    expect(sql).toContain(
      "'public_pattern_bonus', COALESCE(ppb.bonus, 0) * bm.multiplier * cm.multiplier"
    );
    expect(sql).toContain("'follow_legs', COALESCE(lfls.score, 0) * bm.multiplier * cm.multiplier");
  });

  it('keeps total follow-legs math as LAN-local plus bounded public bonus', () => {
    expect(sql).toContain('FROM local_follow_legs_score lfls');
    expect(sql).toContain('CROSS JOIN public_pattern_bonus_raw ppbr');
    expect(sql).toContain('COALESCE(lfls.score, 0) +');
    expect(sql).toContain('COALESCE(ppbr.bonus, 0)');
  });

  it('emits only the effective incremental public contribution after the follow-legs cap', () => {
    expect(sql).toContain('COALESCE(fls.score, 0) - COALESCE(lfls.score, 0)');
    expect(sql).toContain('GREATEST(');
  });
});

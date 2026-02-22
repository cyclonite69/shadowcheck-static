import {
  getSignalColor,
  getSignalDisplay,
  getTimespanBadgeStyle,
  getTimespanDisplay,
} from '../networkFormatting';

describe('getSignalColor', () => {
  it('returns green (#10b981) for excellent signal ≥ -50 dBm', () => {
    expect(getSignalColor(-50)).toBe('#10b981');
    expect(getSignalColor(-30)).toBe('#10b981');
    expect(getSignalColor(0)).toBe('#6b7280'); // 0 means no data
  });

  it('returns amber (#f59e0b) for acceptable signal < -50 and ≥ -70', () => {
    expect(getSignalColor(-51)).toBe('#f59e0b');
    expect(getSignalColor(-70)).toBe('#f59e0b');
  });

  it('returns red (#ef4444) for poor signal < -70', () => {
    expect(getSignalColor(-71)).toBe('#ef4444');
    expect(getSignalColor(-90)).toBe('#ef4444');
  });

  it('returns grey (#6b7280) for null', () => {
    expect(getSignalColor(null)).toBe('#6b7280');
  });

  it('returns grey (#6b7280) for 0 (no-data sentinel)', () => {
    expect(getSignalColor(0)).toBe('#6b7280');
  });
});

describe('getSignalDisplay', () => {
  it('returns formatted dBm string for a valid signal value', () => {
    expect(getSignalDisplay(-65)).toBe('-65 dBm');
    expect(getSignalDisplay(-50)).toBe('-50 dBm');
  });

  it('returns N/A for null', () => {
    expect(getSignalDisplay(null)).toBe('N/A');
  });

  it('returns N/A for 0 (no-data sentinel)', () => {
    expect(getSignalDisplay(0)).toBe('N/A');
  });
});

describe('getTimespanBadgeStyle', () => {
  it('returns red style for spans > 30 days', () => {
    const style = getTimespanBadgeStyle(31);
    expect(style.color).toBe('#f87171');
    expect(style.bg).toContain('239, 68, 68');
    expect(style.border).toContain('239, 68, 68');
  });

  it('returns amber style for spans > 7 and ≤ 30 days', () => {
    const style8 = getTimespanBadgeStyle(8);
    expect(style8.color).toBe('#fbbf24');
    expect(style8.bg).toContain('251, 191, 36');

    const style30 = getTimespanBadgeStyle(30);
    expect(style30.color).toBe('#fbbf24');
  });

  it('returns green style for spans ≤ 7 days', () => {
    const style = getTimespanBadgeStyle(7);
    expect(style.color).toBe('#4ade80');
    expect(style.bg).toContain('34, 197, 94');

    const style0 = getTimespanBadgeStyle(0);
    expect(style0.color).toBe('#4ade80');
  });
});

describe('getTimespanDisplay', () => {
  it('returns "Same day" for 0 days', () => {
    expect(getTimespanDisplay(0)).toBe('Same day');
  });

  it('returns "<n> days" for non-zero spans', () => {
    expect(getTimespanDisplay(7)).toBe('7 days');
    expect(getTimespanDisplay(30)).toBe('30 days');
    expect(getTimespanDisplay(1)).toBe('1 days');
  });
});

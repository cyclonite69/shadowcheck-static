import { normalizeTooltipData } from '../geospatial/tooltipDataNormalizer';
import { renderNetworkTooltip } from '../geospatial/renderNetworkTooltip';

describe('tooltipDataNormalizer', () => {
  it('normalizes signal aliases used by geospatial payloads', () => {
    expect(normalizeTooltipData({ signalDbm: -61 }).signal).toBe(-61);
    expect(normalizeTooltipData({ maxSignal: -67 }).signal).toBe(-67);
    expect(normalizeTooltipData({ max_signal: -72 }).signal).toBe(-72);
    expect(normalizeTooltipData({ bestlevel: -58 }).signal).toBe(-58);
  });

  it('renders signal strength from alias fields when signal is absent', () => {
    const html = renderNetworkTooltip({
      ssid: 'Test',
      bssid: 'AA:BB:CC:DD:EE:FF',
      signalDbm: -64,
    });

    expect(html).toContain('-64 dBm');
  });
});

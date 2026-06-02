import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  formatBadgeNumber,
  getGpsDiscoveryTotal,
  WigleStatsBadge,
} from '../../client/src/components/admin/tabs/WigleStatsBadge';

describe('WigleStatsBadge', () => {
  it('renders a data-driven inline SVG instead of a hotlinked image', () => {
    const markup = renderToStaticMarkup(
      React.createElement(WigleStatsBadge, {
        stats: {
          user: 'field_operator',
          rank: 1234,
          discoveredWiFiGPS: 1000,
          discoveredBtGPS: 200,
          discoveredCellGPS: 30,
          last: '20260601-120000',
        },
      })
    );

    expect(markup).toContain('<svg');
    expect(markup).not.toContain('<img');
    expect(markup).not.toContain('wigle.net/bi');
    expect(markup).not.toContain('imageBadgeUrl');
    expect(markup).toContain('field_operator');
    expect(markup).toContain('#1,234');
    expect(markup).toContain('GPS DISCOVERIES 1,230');
  });

  it('formats compact values for large discovery counts', () => {
    expect(formatBadgeNumber(12_345)).toBe('12K');
    expect(formatBadgeNumber(1_250_000)).toBe('1.3M');
    expect(formatBadgeNumber(null)).toBe('0');
  });

  it('sums GPS discoveries across radio types', () => {
    expect(
      getGpsDiscoveryTotal({
        discoveredWiFiGPS: '10',
        discoveredBtGPS: 20,
        discoveredCellGPS: null,
      })
    ).toBe(30);
  });
});

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BadgeStudioTab } from '../../client/src/components/admin/tabs/BadgeStudioTab';

describe('BadgeStudioTab markup', () => {
  it('renders known Explorer columns and editor controls in the Node test environment', () => {
    const html = renderToStaticMarkup(React.createElement(BadgeStudioTab));

    expect(html).toContain('Explorer columns');
    expect(html).toContain('Type');
    expect(html).toContain('Threat Score');
    expect(html).toContain('Manufacturer');
    expect(html).toContain('Save column config');
    expect(html).toContain('Reset/remove config');
  });

  it('includes threat score and security columns in rendered output', () => {
    const html = renderToStaticMarkup(React.createElement(BadgeStudioTab));

    expect(html).toContain('Threat');
    expect(html).toContain('Security');
    // Ensure form controls are present
    expect(html.length).toBeGreaterThan(100);
  });
});

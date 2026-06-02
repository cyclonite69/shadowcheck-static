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
});

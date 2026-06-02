import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ComponentProps } from 'react';
import { KmlImportCard } from '../../client/src/components/admin/tabs/data-import/KmlImportCard';
import type { KmlImportStatusResponse } from '../../client/src/types/kmlImport';

const status: KmlImportStatusResponse = {
  totals: {
    file_count: 234,
    point_count: 316445,
    wigle_file_count: 234,
    latest_imported_at: '2026-04-04T01:09:31.717Z',
  },
  files: [
    {
      id: 234,
      source_file: 'wigle_downloads/20260331-00449.kml',
      source_name: 'WiGLE_Upload-20260331-00449',
      source_type: 'wigle',
      file_hash: 'b0783e718afd0000000000000000000000000000000000000000000000000000',
      hash_prefix: 'b0783e718afd',
      placemark_count: 3597,
      point_count: 3597,
      imported_at: '2026-04-04T01:09:31.717Z',
    },
  ],
};

const renderCard = (overrides: Partial<ComponentProps<typeof KmlImportCard>> = {}) => {
  const props: ComponentProps<typeof KmlImportCard> = {
    isLoading: false,
    kmlImports: status,
    kmlImportsError: null,
    kmlImportsLoading: false,
    kmlImportStatus: '',
    onFilesChange: jest.fn(),
    onFolderChange: jest.fn(),
    onRefreshImports: jest.fn(),
    ...overrides,
  };

  return renderToStaticMarkup(React.createElement(KmlImportCard, props));
};

describe('KmlImportCard', () => {
  it('renders imported status totals', () => {
    const html = renderCard();

    expect(html).toContain('Imported KMLs');
    expect(html).toContain('234');
    expect(html).toContain('316,445');
  });

  it('renders recent imported files', () => {
    const html = renderCard();

    expect(html).toContain('wigle_downloads/20260331-00449.kml');
    expect(html).toContain('wigle');
    expect(html).toContain('b0783e718afd');
    expect(html).toContain('3,597');
  });

  it('renders duplicate skip status safely', () => {
    const html = renderCard({
      kmlImportStatus: 'Imported 0 KML file(s) into 0 staged points (1 duplicate skipped)',
    });

    expect(html).toContain('duplicate skipped');
  });
});

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ComponentProps } from 'react';
import { KmlImportCard } from '../../client/src/components/admin/tabs/data-import/KmlImportCard';
import type { KmlImportStatusResponse } from '../../client/src/types/kmlImport';

jest.mock('../../client/src/api/adminApi', () => ({
  adminApi: {
    getWigleKmlSyncStatus: jest.fn().mockResolvedValue({
      configured: false,
      supported: false,
      status: 'credentials_missing',
      message: 'WiGLE API credentials are not configured.',
      recommendation: 'Configure wigle_api_name and wigle_api_token in Settings.',
      localKml: {
        fileCount: 0,
        pointCount: 0,
        latestImportedAt: null,
      },
    }),
  },
}));

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

describe('KmlImportCard - WiGLE Remote Sync', () => {
  let useStateSpy: jest.SpyInstance;

  afterEach(() => {
    if (useStateSpy) {
      useStateSpy.mockRestore();
    }
    jest.clearAllMocks();
  });

  it('renders WiGLE Remote Sync section and loading state initially', () => {
    const html = renderCard();
    expect(html).toContain('WiGLE Remote Sync');
    expect(html).toContain('Loading sync status...');
  });

  it('renders credentials missing state safely', () => {
    let stateCall = 0;
    useStateSpy = jest.spyOn(React, 'useState').mockImplementation((init?: any): any => {
      stateCall++;
      if (stateCall === 1) {
        return [
          {
            configured: false,
            supported: false,
            status: 'credentials_missing',
            message: 'WiGLE API credentials are not configured.',
            recommendation: 'Configure wigle_api_name and wigle_api_token in Settings.',
            localKml: {
              fileCount: 234,
              pointCount: 316445,
              latestImportedAt: '2026-04-04T01:09:31.717Z',
            },
          },
          jest.fn(),
        ];
      }
      return [init, jest.fn()];
    });

    const html = renderCard();
    expect(html).toContain('WiGLE Remote Sync');
    expect(html).toContain('Credentials');
    expect(html).toContain('Missing');
    expect(html).toContain('Remote Listing');
    expect(html).toContain('Unsupported');
    expect(html).toContain(
      'ShadowCheck has not found a documented WiGLE API endpoint for listing/downloading uploaded KML/KMZ artifacts.'
    );
  });

  it('renders unsupported state safely with credentials configured', () => {
    let stateCall = 0;
    useStateSpy = jest.spyOn(React, 'useState').mockImplementation((init?: any): any => {
      stateCall++;
      if (stateCall === 1) {
        return [
          {
            configured: true,
            supported: false,
            status: 'remote_listing_unsupported',
            message:
              'ShadowCheck has not found a documented WiGLE API endpoint for listing/downloading uploaded KML/KMZ artifacts.',
            recommendation: 'Manual KML upload remains the supported path.',
            localKml: {
              fileCount: 234,
              pointCount: 316445,
              latestImportedAt: '2026-04-04T01:09:31.717Z',
            },
          },
          jest.fn(),
        ];
      }
      return [init, jest.fn()];
    });

    const html = renderCard();
    expect(html).toContain('WiGLE Remote Sync');
    expect(html).toContain('Credentials');
    expect(html).toContain('Configured');
    expect(html).toContain('Remote Listing');
    expect(html).toContain('Unsupported');
  });

  it('renders disabled buttons with tooltips', () => {
    let stateCall = 0;
    useStateSpy = jest.spyOn(React, 'useState').mockImplementation((init?: any): any => {
      stateCall++;
      if (stateCall === 1) {
        return [
          {
            configured: true,
            supported: false,
            status: 'remote_listing_unsupported',
            message: 'ShadowCheck has not found a documented WiGLE API endpoint...',
            recommendation: 'Manual KML upload remains the supported path.',
            localKml: {
              fileCount: 234,
              pointCount: 316445,
              latestImportedAt: '2026-04-04T01:09:31.717Z',
            },
          },
          jest.fn(),
        ];
      }
      return [init, jest.fn()];
    });

    const html = renderCard();
    expect(html).toContain('disabled=""');
    expect(html).toContain('Check WiGLE');
    expect(html).toContain('Sync now');
    expect(html).toContain('title="WiGLE remote KML listing is unsupported in this version"');
    expect(html).toContain('title="WiGLE remote KML sync is unsupported in this version"');
  });
});

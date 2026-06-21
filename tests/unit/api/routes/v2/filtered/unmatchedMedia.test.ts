const mockGetUnmatchedMediaPoints = jest.fn();

jest.mock('../../../../../../server/src/services/adminNetworkMediaService', () => ({
  getUnmatchedMediaPoints: (...args: unknown[]) => mockGetUnmatchedMediaPoints(...args),
}));

import { createUnmatchedMediaHandler } from '../../../../../../server/src/api/routes/v2/filtered/handlers/unmatchedMedia';

describe('server/src/api/routes/v2/filtered/handlers/unmatchedMedia', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps unmatched media service rows to GeoJSON point features', async () => {
    mockGetUnmatchedMediaPoints.mockResolvedValue([
      {
        id: 42,
        bssid: 'VISINT_UNMATCHED',
        filename: 'field.jpg',
        exif_lat: '43.02',
        exif_lon: '-83.69',
        exif_captured_at: '2026-06-12T01:02:03Z',
      },
    ]);
    const res = { json: jest.fn() };

    await createUnmatchedMediaHandler({} as any)({} as any, res as any);

    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-83.69, 43.02] },
          properties: {
            id: 42,
            bssid: 'VISINT_UNMATCHED',
            filename: 'field.jpg',
            captured_at: '2026-06-12T01:02:03Z',
            thumbnail_url: '/api/v2/networks/media/42/thumbnail',
            inline_url: '/api/v2/networks/media/42/inline',
          },
        },
      ],
    });
  });
});

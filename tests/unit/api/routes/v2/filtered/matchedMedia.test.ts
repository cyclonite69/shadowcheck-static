const mockGetMatchedMediaPoints = jest.fn();

jest.mock('../../../../../../server/src/services/adminNetworkMediaService', () => ({
  getMatchedMediaPoints: (...args: unknown[]) => mockGetMatchedMediaPoints(...args),
}));

import { createMatchedMediaHandler } from '../../../../../../server/src/api/routes/v2/filtered/handlers/matchedMedia';

describe('server/src/api/routes/v2/filtered/handlers/matchedMedia', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps matched media service rows to GeoJSON component features', async () => {
    mockGetMatchedMediaPoints.mockResolvedValue([
      {
        component_id: 'AA:BB:CC:DD:EE:FF',
        lat: '43.02',
        lon: '-83.69',
        media_count: 2,
        media_ids: ['10', '11'],
        member_bssids: ['AA:BB:CC:DD:EE:FF', 'AA:BB:CC:DD:EE:FE'],
        location_provenance: 'component_location',
      },
    ]);
    const res = { json: jest.fn() };

    await createMatchedMediaHandler({} as any)({} as any, res as any);

    expect(mockGetMatchedMediaPoints).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-83.69, 43.02] },
          properties: {
            component_id: 'AA:BB:CC:DD:EE:FF',
            media_count: 2,
            media_ids: ['10', '11'],
            member_bssids: ['AA:BB:CC:DD:EE:FF', 'AA:BB:CC:DD:EE:FE'],
            location_provenance: 'component_location',
            location_confidence: null,
          },
        },
      ],
    });
  });
});

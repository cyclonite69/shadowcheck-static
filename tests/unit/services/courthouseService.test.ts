export {};
const courthouseService = require('../../../server/src/services/courthouseService');
const courthouseRepository = require('../../../server/src/repositories/courthouseRepository');

jest.mock('../../../server/src/repositories/courthouseRepository');

describe('courthouseService', () => {
  it('should call fetchFederalCourthousesGeoJSON from repository', async () => {
    const mockData = { type: 'FeatureCollection', features: [] };
    (courthouseRepository.fetchFederalCourthousesGeoJSON as jest.Mock).mockResolvedValue(mockData);

    const result = await courthouseService.getFederalCourthousesGeoJSON();
    expect(result).toEqual(mockData);
    expect(courthouseRepository.fetchFederalCourthousesGeoJSON).toHaveBeenCalled();
  });

  it('should call findNearestCourthousesBatch from repository', async () => {
    const mockData = [{ id: 1, cluster_id: 0 }];
    (courthouseRepository.findNearestCourthousesBatch as jest.Mock).mockResolvedValue(mockData);

    const result = await courthouseService.getNearestCourthousesBatch(['AA:BB'], 250);

    expect(result).toEqual(mockData);
    expect(courthouseRepository.findNearestCourthousesBatch).toHaveBeenCalledWith(['AA:BB'], 250);
  });
});

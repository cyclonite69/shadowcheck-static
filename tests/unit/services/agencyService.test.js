const agencyService = require('../../../server/src/services/agencyService');
const agencyRepository = require('../../../server/src/repositories/agencyRepository');

jest.mock('../../../server/src/repositories/agencyRepository');

describe('agencyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getAgencyOfficesGeoJSON calls repository', async () => {
    const mockData = { type: 'FeatureCollection', features: [] };
    agencyRepository.fetchAgencyOfficesGeoJSON.mockResolvedValue(mockData);
    const result = await agencyService.getAgencyOfficesGeoJSON();
    expect(agencyRepository.fetchAgencyOfficesGeoJSON).toHaveBeenCalled();
    expect(result).toEqual(mockData);
  });

  test('getAgencyOfficeCountByType calls repository', async () => {
    const mockData = { police: 10 };
    agencyRepository.fetchAgencyOfficeCounts.mockResolvedValue(mockData);
    const result = await agencyService.getAgencyOfficeCountByType();
    expect(agencyRepository.fetchAgencyOfficeCounts).toHaveBeenCalled();
    expect(result).toEqual(mockData);
  });

  test('getNearestAgenciesToNetwork calls repository', async () => {
    const mockData = [{ id: 1 }];
    agencyRepository.findNearestAgenciesToNetwork.mockResolvedValue(mockData);
    const result = await agencyService.getNearestAgenciesToNetwork(123);
    expect(agencyRepository.findNearestAgenciesToNetwork).toHaveBeenCalledWith(123);
    expect(result).toEqual(mockData);
  });

  test('getNearestAgenciesToNetworksBatch calls repository', async () => {
    const mockData = [[{ id: 1 }]];
    agencyRepository.findNearestAgenciesBatch.mockResolvedValue(mockData);
    const result = await agencyService.getNearestAgenciesToNetworksBatch([1, 2]);
    expect(agencyRepository.findNearestAgenciesBatch).toHaveBeenCalledWith([1, 2]);
    expect(result).toEqual(mockData);
  });
});

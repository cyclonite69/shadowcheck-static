const agencyService = require('../../../server/src/services/agencyService');
import * as agencyRepository from '../../../server/src/repositories/agencyRepository';

jest.mock('../../../server/src/repositories/agencyRepository');

const mockedAgencyRepository = agencyRepository as jest.Mocked<typeof agencyRepository>;

describe('agencyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getAgencyOfficesGeoJSON calls repository', async () => {
    const mockData = { type: 'FeatureCollection' as const, features: [] };
    mockedAgencyRepository.fetchAgencyOfficesGeoJSON.mockResolvedValue(mockData);
    const result = await agencyService.getAgencyOfficesGeoJSON();
    expect(mockedAgencyRepository.fetchAgencyOfficesGeoJSON).toHaveBeenCalled();
    expect(result).toEqual(mockData);
  });

  test('getAgencyOfficeCountByType calls repository', async () => {
    const mockData = { police: 10 };
    mockedAgencyRepository.fetchAgencyOfficeCounts.mockResolvedValue(mockData as any);
    const result = await agencyService.getAgencyOfficeCountByType();
    expect(mockedAgencyRepository.fetchAgencyOfficeCounts).toHaveBeenCalled();
    expect(result).toEqual(mockData);
  });

  test('getNearestAgenciesToNetwork calls repository', async () => {
    const mockData = [{ id: 1 }];
    mockedAgencyRepository.findNearestAgenciesToNetwork.mockResolvedValue(mockData as any);
    const result = await agencyService.getNearestAgenciesToNetwork(123);
    expect(mockedAgencyRepository.findNearestAgenciesToNetwork).toHaveBeenCalledWith(123);
    expect(result).toEqual(mockData);
  });

  test('getNearestAgenciesToNetworksBatch calls repository', async () => {
    const mockData = [[{ id: 1 }]];
    mockedAgencyRepository.findNearestAgenciesBatch.mockResolvedValue(mockData as any);
    const result = await agencyService.getNearestAgenciesToNetworksBatch([1, 2]);
    expect(mockedAgencyRepository.findNearestAgenciesBatch).toHaveBeenCalledWith([1, 2]);
    expect(result).toEqual(mockData);
  });
});

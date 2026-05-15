import { buildCreateImportRunInput } from '../../../server/src/services/wigleImport/mappers/buildCreateImportRunInput';

describe('buildCreateImportRunInput', () => {
  it('builds normalized v2 import input from query params', () => {
    const input = buildCreateImportRunInput({
      latitude1: '42.1',
      latitude2: '42.2',
      longitude1: '-83.1',
      longitude2: '-83.2',
      region: 'MI',
      resultsPerPage: '75',
      version: 'v2',
    });

    expect(input).toEqual(
      expect.objectContaining({
        source: 'wigle_v2',
        apiVersion: 'v2',
        state: 'MI',
        pageSize: 75,
      })
    );
    expect(input.requestFingerprint).toEqual(expect.any(String));
    expect(input.requestParams).toEqual(expect.any(Object));
  });

  it('uses raw request metadata when direct overrides are supplied', () => {
    const input = buildCreateImportRunInput(
      {
        region: 'US',
        resultsPerPage: '120',
      },
      {
        source: 'v3_batch',
        api_version: 'v3',
        search_term: 'Global / US',
      }
    );

    expect(input).toEqual(
      expect.objectContaining({
        source: 'v3_batch',
        apiVersion: 'v3',
        searchTerm: 'Global / US',
        pageSize: 120,
      })
    );
    expect(input.requestFingerprint).toEqual(expect.any(String));
  });
});

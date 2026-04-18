import * as Index from '../../server/src/services/filterQueryBuilder';

describe('FilterQueryBuilder Index', () => {
  test('all expected exports are present', () => {
    expect(Index.UniversalFilterQueryBuilder).toBeDefined();
    expect(Index.FilterPredicateBuilder).toBeDefined();
    expect(Index.QueryState).toBeDefined();
    expect(Index.SCHEMA_ALIASES).toBeDefined();
    expect(Index.FIELD_EXPRESSIONS).toBeDefined();
    expect(Index.NULL_SAFE_COMPARISONS).toBeDefined();
    expect(Index.SqlFragmentLibrary).toBeDefined();
    expect(Index.NetworkListQueryBuilder).toBeDefined();
    expect(Index.NetworkOnlyQueryBuilder).toBeDefined();
    expect(Index.GeospatialQueryBuilder).toBeDefined();
    expect(Index.validateFilterPayload).toBeDefined();
    expect(Index.DEFAULT_ENABLED).toBeDefined();
    expect(Index.isOui).toBeDefined();
    expect(Index.coerceOui).toBeDefined();
  });
});

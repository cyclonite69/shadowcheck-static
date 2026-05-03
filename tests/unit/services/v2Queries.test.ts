import { buildListNetworksQuery } from '../../../server/src/services/v2Queries';

describe('v2Queries', () => {
  it('should build a valid list networks query', () => {
    const opts = {
      limit: 10,
      offset: 0,
      search: 'test',
      sort: 'observed_at',
      order: 'DESC' as const,
    };
    const result = buildListNetworksQuery(opts);
    expect(result.sql).toContain('WITH obs_latest AS');
    expect(result.params).toEqual(['%test%', '%test%', 10, 0]);
  });

  it('should use default sort when sort is unknown', () => {
    const opts = {
      limit: 10,
      offset: 0,
      search: '',
      sort: 'unknown',
      order: 'DESC' as const,
    };
    const result = buildListNetworksQuery(opts);
    expect(result.sql).toContain('ORDER BY latest_time DESC');
  });

  it('should escape literal underscore in search terms', () => {
    const result = buildListNetworksQuery({
      limit: 10,
      offset: 0,
      search: 'x_',
      sort: 'observed_at',
      order: 'DESC',
    });

    expect(result.sql).toContain("obs_latest.ssid ILIKE $1 ESCAPE '\\'");
    expect(result.params).toEqual(['%x\\_%', '%x\\_%', 10, 0]);
  });
});

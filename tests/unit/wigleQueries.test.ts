export {};

import {
  buildWigleObservationsQuery,
  buildWigleSearchQuery,
  buildWigleV2CountQuery,
  buildWigleV2NetworksQuery,
  buildWigleV3CountQuery,
  buildWigleV3NetworksQuery,
} from '../../server/src/repositories/wigleQueriesRepository';

describe('wigle query builders', () => {
  it('builds bssid and ssid search queries with optional limit', () => {
    const bssidQuery = buildWigleSearchQuery({ bssid: 'AA:BB', limit: 10 });
    const ssidQuery = buildWigleSearchQuery({ ssid: 'Test', limit: null });

    expect(bssidQuery.sql).toContain("bssid ILIKE $1 ESCAPE '\\'");
    expect(ssidQuery.sql).toContain("ssid ILIKE $1 ESCAPE '\\'");
  });

  it('escapes literal wildcard characters in wigle search patterns', () => {
    const query = buildWigleSearchQuery({ ssid: 'x_', limit: 10 });

    expect(query.queryParams).toEqual(['%x\\_%', 10]);
  });

  it('builds v2 network and count queries with where clauses and pagination', () => {
    const data = buildWigleV2NetworksQuery({
      limit: 10,
      offset: 5,
      whereClauses: ['type = $1'],
      queryParams: ['wifi'],
    });
    const count = buildWigleV2CountQuery(['type = $1'], ['wifi']);

    expect(data.sql).toContain('WHERE type = $1');
    expect(data.sql).toContain('LIMIT $2');
    expect(data.sql).toContain('OFFSET $3');
    expect(data.queryParams).toEqual(['wifi', 10, 5]);
    expect(count.sql).toContain('COUNT(*) as total');
  });

  it('builds v3 network and observation queries with optional pagination', () => {
    const v3 = buildWigleV3NetworksQuery({
      limit: 20,
      offset: 0,
      whereClauses: ['obs.ssid ILIKE $1'],
      queryParams: ['%corp%'],
    });
    const observations = buildWigleObservationsQuery('net1', 10, 30);
    const count = buildWigleV3CountQuery(['obs.ssid ILIKE $1'], ['%corp%']);

    expect(v3.sql).toContain('WHERE obs.ssid ILIKE $1');
    expect(v3.sql).toContain('LIMIT $2');
    expect(v3.sql).toContain('OFFSET $3');
    expect(v3.sql).not.toContain('api_network_explorer_mv');
    expect(observations.sql).toContain('WHERE netid = $1');
    expect(observations.sql).toContain('LIMIT $2');
    expect(observations.sql).toContain('OFFSET $3');
    expect(count.sql).toContain('COUNT(*) as total');
  });
});

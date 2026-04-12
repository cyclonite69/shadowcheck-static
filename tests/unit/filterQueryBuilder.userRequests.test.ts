import { UniversalFilterQueryBuilder } from '../../server/src/services/filterQueryBuilder';
import { TemporalScope } from '../../client/src/types/filters';

describe('UniversalFilterQueryBuilder - User Feature Requests', () => {
  describe('BSSID Wildcards', () => {
    test('supports * wildcard', () => {
      const filters = { bssid: '00:11:22:*' };
      const enabled = { bssid: true };
      const builder = new UniversalFilterQueryBuilder(filters, enabled);
      const { sql, params } = builder.buildNetworkListQuery();

      expect(sql).toContain('UPPER(ne.bssid) LIKE $1');
      expect(params).toContain('00:11:22:%');
    });

    test('supports ? wildcard', () => {
      const filters = { bssid: '00:??:22:33:44:55' };
      const enabled = { bssid: true };
      const builder = new UniversalFilterQueryBuilder(filters, enabled);
      const { sql, params } = builder.buildNetworkListQuery();

      expect(sql).toContain('UPPER(ne.bssid) LIKE $1');
      // 17 chars means no trailing %
      expect(params).toContain('00:__:22:33:44:55');
    });

    test('supports NOT with wildcards', () => {
      const filters = { bssid: '-00:11:*' };
      const enabled = { bssid: true };
      const builder = new UniversalFilterQueryBuilder(filters, enabled);
      const { sql, params } = builder.buildNetworkListQuery();

      expect(sql).toContain('UPPER(ne.bssid) NOT LIKE $1');
      expect(params).toContain('00:11:%');
    });
  });

  describe('SSID NOT Operator', () => {
    test('supports - prefix for negation', () => {
      const filters = { ssid: '-kajageet smartbus' };
      const enabled = { ssid: true };
      const builder = new UniversalFilterQueryBuilder(filters, enabled);
      const { sql, params } = builder.buildNetworkListQuery();

      expect(sql).toContain('ne.ssid NOT ILIKE $1');
      expect(params).toContain('%kajageet smartbus%');
    });

    test('supports NOT prefix for negation', () => {
      const filters = { ssid: 'NOT kajageet smartbus' };
      const enabled = { ssid: true };
      const builder = new UniversalFilterQueryBuilder(filters, enabled);
      const { sql, params } = builder.buildNetworkListQuery();

      expect(sql).toContain('ne.ssid NOT ILIKE $1');
      expect(params).toContain('%kajageet smartbus%');
    });
  });

  describe('Temporal Scopes', () => {
    test('filters by FIRST_SEEN', () => {
      const filters = {
        timeframe: {
          type: 'absolute',
          startTimestamp: '2026-10-01T00:00:00Z',
          endTimestamp: '2026-10-31T23:59:59Z',
        },
        temporalScope: TemporalScope.FIRST_SEEN,
      };
      const enabled = { timeframe: true, temporalScope: true };
      const builder = new UniversalFilterQueryBuilder(filters, enabled);
      const { sql } = builder.buildNetworkListQuery();

      expect(sql).toContain('ne.first_seen >= $1::timestamptz');
      expect(sql).toContain('ne.first_seen <= $2::timestamptz');
    });

    test('filters by LAST_SEEN', () => {
      const filters = {
        timeframe: {
          type: 'absolute',
          startTimestamp: '2026-10-01T00:00:00Z',
          endTimestamp: '2026-10-31T23:59:59Z',
        },
        temporalScope: TemporalScope.LAST_SEEN,
      };
      const enabled = { timeframe: true, temporalScope: true };
      const builder = new UniversalFilterQueryBuilder(filters, enabled);
      const { sql } = builder.buildNetworkListQuery();

      expect(sql).toContain('ne.last_seen >= $1::timestamptz');
      expect(sql).toContain('ne.last_seen <= $2::timestamptz');
    });

    test('filters by NETWORK_LIFETIME (overlap check)', () => {
      const filters = {
        timeframe: {
          type: 'absolute',
          startTimestamp: '2026-10-01T00:00:00Z',
          endTimestamp: '2026-10-31T23:59:59Z',
        },
        temporalScope: TemporalScope.NETWORK_LIFETIME,
      };
      const enabled = { timeframe: true, temporalScope: true };
      const builder = new UniversalFilterQueryBuilder(filters, enabled);
      const { sql } = builder.buildNetworkListQuery();

      // Overlap: last_seen >= range_start AND first_seen <= range_end
      expect(sql).toContain('ne.last_seen >= $1::timestamptz');
      expect(sql).toContain('ne.first_seen <= $2::timestamptz');
    });
  });
});

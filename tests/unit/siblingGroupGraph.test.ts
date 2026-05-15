import {
  addUndirectedEdge,
  buildPatternGroupsFromCanonicalMap,
  buildSiblingGroupMap,
  expandNetworksForSiblingSearch,
} from '../../client/src/components/geospatial/utils/siblingGroupGraph';
import type { NetworkRow } from '../../client/src/types/network';

function row(bssid: string, ssid: string): NetworkRow {
  return { bssid, ssid } as NetworkRow;
}

describe('siblingGroupGraph', () => {
  describe('buildSiblingGroupMap', () => {
    it('merges off-list nodes reachable from visible seeds', () => {
      const visible = new Set(['AA:BB:CC:DD:EE:01', 'AA:BB:CC:DD:EE:02']);
      const adjacency = new Map<string, Set<string>>();
      for (const b of visible) adjacency.set(b, new Set());
      addUndirectedEdge(adjacency, 'AA:BB:CC:DD:EE:01', 'AA:BB:CC:DD:EE:02');
      addUndirectedEdge(adjacency, 'AA:BB:CC:DD:EE:02', 'BE:61:A3:7C:BD:09');

      const groupMap = buildSiblingGroupMap(visible, adjacency);
      expect(groupMap.get('BE:61:A3:7C:BD:09')).toBe(groupMap.get('AA:BB:CC:DD:EE:01'));
      expect(groupMap.size).toBe(3);
    });
  });

  describe('buildPatternGroupsFromCanonicalMap', () => {
    it('keeps all canonical members even when only one row is hydrated', () => {
      const canonical = new Map<string, string>([
        ['8C:61:A3:7C:BD:08', 'S1'],
        ['BE:61:A3:7C:BD:09', 'S1'],
      ]);
      const { groupMap, groupMembers } = buildPatternGroupsFromCanonicalMap(canonical);
      expect(groupMap.size).toBe(2);
      expect(groupMembers.get('S1')).toEqual(
        expect.arrayContaining(['8C:61:A3:7C:BD:08', 'BE:61:A3:7C:BD:09'])
      );
    });
  });

  describe('expandNetworksForSiblingSearch', () => {
    const groupMap = new Map<string, string>([
      ['8C:61:A3:7C:BD:08', 'S1'],
      ['9E:61:A3:7C:BD:09', 'S1'],
      ['BE:61:A3:7C:BD:09', 'S1'],
    ]);

    it('expands search hits to full sibling group', () => {
      const searchResults = [
        row('8C:61:A3:7C:BD:08', 'undertaker'),
        row('8C:61:A3:7C:BD:07', 'undertaker'),
      ];
      const missing = [row('BE:61:A3:7C:BD:09', 'Xfinity')];

      const { networks: expanded, unresolvedBssids } = expandNetworksForSiblingSearch(
        searchResults,
        missing,
        groupMap,
        'undertaker'
      );

      const bssids = expanded.map((n) => n.bssid?.toUpperCase());
      expect(bssids).toContain('BE:61:A3:7C:BD:09');
      expect(bssids).toContain('8C:61:A3:7C:BD:08');
      expect(unresolvedBssids).toEqual(expect.arrayContaining(['9E:61:A3:7C:BD:09']));
      expect(unresolvedBssids).not.toContain('BE:61:A3:7C:BD:09');
    });

    it('expands from Xfinity search hit to undertaker siblings', () => {
      const searchResults = [row('BE:61:A3:7C:BD:09', 'Xfinity')];
      const missing = [
        row('8C:61:A3:7C:BD:08', 'undertaker'),
        row('9E:61:A3:7C:BD:09', 'undertaker'),
      ];

      const { networks: expanded } = expandNetworksForSiblingSearch(
        searchResults,
        missing,
        groupMap,
        'Xfinity'
      );

      const bssids = expanded.map((n) => n.bssid?.toUpperCase());
      expect(bssids).toContain('8C:61:A3:7C:BD:08');
      expect(bssids).toContain('BE:61:A3:7C:BD:09');
    });

    it('without search merges all missing siblings', () => {
      const searchResults = [row('8C:61:A3:7C:BD:08', 'undertaker')];
      const missing = [row('BE:61:A3:7C:BD:09', 'Xfinity')];

      const { networks: expanded } = expandNetworksForSiblingSearch(
        searchResults,
        missing,
        groupMap,
        ''
      );

      expect(expanded.map((n) => n.bssid?.toUpperCase())).toContain('BE:61:A3:7C:BD:09');
    });
  });
});

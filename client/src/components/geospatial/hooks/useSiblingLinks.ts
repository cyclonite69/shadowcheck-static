import { useState, useEffect, useRef } from 'react';
import { networkApi } from '../../../api/networkApi';
import { mapApiRowToNetwork } from '../../../utils/networkDataTransformation';
import { logError } from '../../../logging/clientLogger';
import { NetworkRow } from '../../../types/network';
import {
  addUndirectedEdge,
  buildSiblingGroupMap,
  mergeSiblingComponentsIntoGroupMap,
  normalizeBssid,
  serializeGroupMap,
} from '../utils/siblingGroupGraph';
import { componentSizesFromGroupMap, logSiblingTopology } from '../utils/siblingTopologyDebug';

interface UseSiblingLinksProps {
  isAdmin: boolean;
  selectedAnchorBssid: string | null;
  networks: NetworkRow[];
  /** When set, load full DB components (not page-local edge union). */
  quickSearch?: string;
}

export const useSiblingLinks = ({
  isAdmin,
  selectedAnchorBssid,
  networks,
  quickSearch = '',
}: UseSiblingLinksProps) => {
  const [linkedSiblingBssids, setLinkedSiblingBssids] = useState<Set<string>>(new Set());
  const [visibleSiblingGroupMap, setVisibleSiblingGroupMap] = useState<Map<string, string>>(
    new Map()
  );
  const [missingSiblingNetworks, setMissingSiblingNetworks] = useState<NetworkRow[]>([]);
  const [hydrationFailedBssids, setHydrationFailedBssids] = useState<string[]>([]);
  const prevHydrationKeyRef = useRef('');

  useEffect(() => {
    if (!isAdmin || !selectedAnchorBssid) {
      setLinkedSiblingBssids(new Set());
      return;
    }

    let cancelled = false;
    const loadSiblingLinks = async () => {
      try {
        const result = await networkApi.getNetworkSiblingLinks(selectedAnchorBssid);
        if (cancelled) return;
        const nextSet = new Set<string>(
          Array.isArray(result?.links)
            ? result.links.map((row: any) => normalizeBssid(row?.sibling_bssid)).filter(Boolean)
            : []
        );
        setLinkedSiblingBssids(nextSet);
      } catch (error) {
        if (!cancelled) {
          logError('Failed to load sibling links', error);
          setLinkedSiblingBssids(new Set());
        }
      }
    };

    void loadSiblingLinks();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, selectedAnchorBssid]);

  useEffect(() => {
    if (!isAdmin || networks.length === 0) {
      setVisibleSiblingGroupMap(new Map());
      setMissingSiblingNetworks([]);
      setHydrationFailedBssids([]);
      prevHydrationKeyRef.current = '';
      return;
    }

    let cancelled = false;
    const loadVisibleSiblingGroups = async () => {
      try {
        const visibleBssids = networks
          .map((network) => normalizeBssid(network.bssid))
          .filter(Boolean);
        const visibleSet = new Set(visibleBssids);
        const hasSearch = quickSearch.trim().length > 0;

        if (hasSearch && visibleBssids.length > 0) {
          // Fix performance regression: only fetch the full component for the primary search hit (anchor).
          // Search results are already filtered; we treat the first result as the anchor for expansion.
          const anchorBssid = visibleBssids[0];
          const componentResult = await networkApi.getSiblingComponentBssids(anchorBssid);
          if (cancelled) return;

          const components = [
            Array.isArray(componentResult?.bssids)
              ? componentResult.bssids.map((b: string) => normalizeBssid(b))
              : [],
          ];
          const groupMap = mergeSiblingComponentsIntoGroupMap(components);
          const missing = [...groupMap.keys()].filter((bssid) => !visibleSet.has(bssid));

          logSiblingTopology('useSiblingLinks.searchComponent', {
            quickSearch: quickSearch.trim(),
            visibleBssids,
            componentSizes: componentSizesFromGroupMap(groupMap),
            graphMapSize: groupMap.size,
            missingHydrationBssids: missing,
          });

          setVisibleSiblingGroupMap(groupMap);

          const hydrationKey = `${serializeGroupMap(groupMap)}::${missing.sort().join(',')}`;
          if (hydrationKey === prevHydrationKeyRef.current) return;
          prevHydrationKeyRef.current = hydrationKey;

          if (missing.length > 0) {
            try {
              const rows = await Promise.all(missing.map((b) => networkApi.getNetworkByBssid(b)));
              if (!cancelled) {
                const hydrated: NetworkRow[] = [];
                const failed: string[] = [];
                for (let i = 0; i < missing.length; i++) {
                  const row = rows[i];
                  if (row) {
                    hydrated.push(mapApiRowToNetwork(row, 50000 + i));
                  } else {
                    failed.push(missing[i]);
                  }
                }
                setMissingSiblingNetworks(hydrated);
                setHydrationFailedBssids(failed);
                logSiblingTopology('useSiblingLinks.hydration', {
                  requested: missing.length,
                  successCount: hydrated.length,
                  failedBssids: failed,
                  hydratedBssids: hydrated.map((n) => normalizeBssid(n.bssid)),
                });
              }
            } catch {
              if (!cancelled) {
                setMissingSiblingNetworks([]);
                setHydrationFailedBssids(missing);
              }
            }
          } else {
            setMissingSiblingNetworks([]);
            setHydrationFailedBssids([]);
          }
          return;
        }

        const adjacency = new Map<string, Set<string>>();

        for (const bssid of visibleSet) adjacency.set(bssid, new Set());

        const batchResult = await networkApi.getNetworkSiblingLinksBatch(visibleBssids);
        if (cancelled) return;

        const batchEdges = Array.isArray(batchResult?.links) ? batchResult.links : [];
        for (const edge of batchEdges) {
          addUndirectedEdge(adjacency, edge?.bssid_a, edge?.bssid_b);
        }

        // Full star per visible row — batch OR-query can miss transitive/off-filter siblings.
        const anchorResults = await Promise.all(
          visibleBssids.map((bssid) => networkApi.getNetworkSiblingLinks(bssid))
        );
        if (cancelled) return;

        for (let i = 0; i < visibleBssids.length; i++) {
          const anchor = visibleBssids[i];
          const links = Array.isArray(anchorResults[i]?.links) ? anchorResults[i].links : [];
          for (const row of links) {
            addUndirectedEdge(adjacency, anchor, row?.sibling_bssid);
          }
        }

        const edgeCount = [...adjacency.values()].reduce((sum, s) => sum + s.size, 0) / 2;
        const groupMap = buildSiblingGroupMap(visibleSet, adjacency);
        const missing = [...groupMap.keys()].filter((bssid) => !visibleSet.has(bssid));

        logSiblingTopology('useSiblingLinks', {
          visibleBssids,
          edgeCount,
          graphMapSize: groupMap.size,
          componentSizes: componentSizesFromGroupMap(groupMap),
          missingHydrationBssids: missing,
        });

        setVisibleSiblingGroupMap(groupMap);

        const hydrationKey = `${serializeGroupMap(groupMap)}::${missing.sort().join(',')}`;
        if (hydrationKey === prevHydrationKeyRef.current) return;
        prevHydrationKeyRef.current = hydrationKey;

        if (missing.length > 0) {
          try {
            const rows = await Promise.all(missing.map((b) => networkApi.getNetworkByBssid(b)));
            if (!cancelled) {
              const hydrated: NetworkRow[] = [];
              const failed: string[] = [];
              for (let i = 0; i < missing.length; i++) {
                const row = rows[i];
                if (row) {
                  hydrated.push(mapApiRowToNetwork(row, 50000 + i));
                } else {
                  failed.push(missing[i]);
                }
              }
              setMissingSiblingNetworks(hydrated);
              setHydrationFailedBssids(failed);

              logSiblingTopology('useSiblingLinks.hydration', {
                requested: missing.length,
                successCount: hydrated.length,
                failedBssids: failed,
                hydratedBssids: hydrated.map((n) => normalizeBssid(n.bssid)),
              });
            }
          } catch {
            if (!cancelled) {
              setMissingSiblingNetworks([]);
              setHydrationFailedBssids(missing);
              logSiblingTopology('useSiblingLinks.hydration', {
                requested: missing.length,
                successCount: 0,
                failedBssids: missing,
                error: 'batch hydration threw',
              });
            }
          }
        } else {
          setMissingSiblingNetworks([]);
          setHydrationFailedBssids([]);
        }
      } catch (error) {
        if (!cancelled) {
          logError('Failed to load visible sibling groups', error);
          setVisibleSiblingGroupMap(new Map());
          setMissingSiblingNetworks([]);
          setHydrationFailedBssids([]);
          prevHydrationKeyRef.current = '';
        }
      }
    };

    void loadVisibleSiblingGroups();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, networks, quickSearch]);

  return {
    linkedSiblingBssids,
    visibleSiblingGroupMap,
    setLinkedSiblingBssids,
    missingSiblingNetworks,
    hydrationFailedBssids,
  };
};

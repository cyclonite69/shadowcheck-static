import { useState, useEffect, useRef } from 'react';
import { networkApi } from '../../../api/networkApi';
import { mapApiRowToNetwork } from '../../../utils/networkDataTransformation';
import { logError } from '../../../logging/clientLogger';
import { NetworkRow } from '../../../types/network';
import {
  addUndirectedEdge,
  buildSiblingGroupMap,
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
  const [nonRenderableBssids, setNonRenderableBssids] = useState<string[]>([]);
  const [missingDbBssids, setMissingDbBssids] = useState<string[]>([]);
  const prevHydrationKeyRef = useRef('');

  useEffect(() => {
    if (!isAdmin || !selectedAnchorBssid) {
      setLinkedSiblingBssids(new Set());
      return;
    }

    // Immediately clear stale selected anchor links when anchor changes
    setLinkedSiblingBssids(new Set());

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
      setNonRenderableBssids([]);
      setMissingDbBssids([]);
      prevHydrationKeyRef.current = '';
      return;
    }

    // Immediately clear previous sibling link groupings and hydrated arrays to prevent stale flash
    setVisibleSiblingGroupMap(new Map());
    setMissingSiblingNetworks([]);
    setHydrationFailedBssids([]);
    setNonRenderableBssids([]);
    setMissingDbBssids([]);
    prevHydrationKeyRef.current = '';

    let cancelled = false;
    const loadVisibleSiblingGroups = async () => {
      try {
        const visibleBssids = networks
          .map((network) => normalizeBssid(network.bssid))
          .filter(Boolean);
        const visibleSet = new Set(visibleBssids);
        const searchStr = quickSearch.trim().toLowerCase();
        const hasSearch = searchStr.length > 0;

        if (hasSearch && visibleBssids.length > 0) {
          // Parse quickSearch prefix to determine the correct match field:
          //   m:<value>  → manufacturer
          //   s:<value>  → SSID only
          //   b:<value>  → BSSID only
          //   <value>    → SSID or BSSID (default)
          const prefixMatch = quickSearch.trim().match(/^([sbm]):\s*(.+)$/i);
          let matchField: 'ssid' | 'bssid' | 'manufacturer' = 'ssid';
          let matchStr = searchStr; // already lowercased

          if (prefixMatch) {
            const prefix = prefixMatch[1].toLowerCase();
            matchStr = prefixMatch[2].trim().toLowerCase();
            if (prefix === 'm') matchField = 'manufacturer';
            else if (prefix === 'b') matchField = 'bssid';
            // 's' → matchField stays 'ssid'
          }

          // Filter to networks that match the correct field.
          const searchHits = networks.filter((n) => {
            switch (matchField) {
              case 'manufacturer':
                return n.manufacturer?.toLowerCase().includes(matchStr);
              case 'bssid':
                return n.bssid.toLowerCase().includes(matchStr);
              default:
                return (
                  n.ssid?.toLowerCase().includes(matchStr) ||
                  n.bssid.toLowerCase().includes(matchStr)
                );
            }
          });

          if (searchHits.length === 0) {
            setVisibleSiblingGroupMap(new Map());
            setMissingSiblingNetworks([]);
            return;
          }

          // Build sibling graph from ALL matching search hits' precomputed sibling_bssids.
          // This keeps independent pairs isolated rather than merging them through a single
          // anchor's recursive DB component.
          const searchAdjacency = new Map<string, Set<string>>();
          for (const bssid of visibleSet) searchAdjacency.set(bssid, new Set());

          const hasPrecomputedSiblingsInHits = searchHits.some(
            (n) => Array.isArray(n.sibling_bssids) && n.sibling_bssids.length > 0
          );

          if (hasPrecomputedSiblingsInHits) {
            for (const network of searchHits) {
              const anchor = normalizeBssid(network.bssid);
              if (!anchor) continue;
              const siblings = Array.isArray(network.sibling_bssids) ? network.sibling_bssids : [];
              for (const sibling of siblings) {
                const normalizedSibling = normalizeBssid(sibling);
                if (!normalizedSibling) continue;
                addUndirectedEdge(searchAdjacency, anchor, normalizedSibling);
              }
            }
          } else {
            // Fallback: batch + per-hit API calls when sibling_bssids are missing.
            const searchHitBssids = searchHits
              .map((n) => normalizeBssid(n.bssid))
              .filter(Boolean) as string[];

            const batchResult = await networkApi.getNetworkSiblingLinksBatch(searchHitBssids);
            if (cancelled) return;

            const batchEdges = Array.isArray(batchResult?.links) ? batchResult.links : [];
            for (const edge of batchEdges) {
              addUndirectedEdge(searchAdjacency, edge?.bssid_a, edge?.bssid_b);
            }

            const anchorResults = await Promise.all(
              searchHitBssids.map((bssid) => networkApi.getNetworkSiblingLinks(bssid))
            );
            if (cancelled) return;

            for (let i = 0; i < searchHitBssids.length; i++) {
              const anchor = searchHitBssids[i];
              const links = Array.isArray(anchorResults[i]?.links) ? anchorResults[i].links : [];
              for (const row of links) {
                addUndirectedEdge(searchAdjacency, anchor, row?.sibling_bssid);
              }
            }
          }

          const groupMap = buildSiblingGroupMap(visibleSet, searchAdjacency);
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
              const CHUNK_SIZE = 100;
              const chunks: string[][] = [];
              for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
                chunks.push(missing.slice(i, i + CHUNK_SIZE));
              }

              const results = await Promise.allSettled(
                chunks.map((chunk) => networkApi.getNetworksByBssids(chunk))
              );

              if (!cancelled) {
                const hydrated: NetworkRow[] = [];
                const failed: string[] = [];
                const nonRenderable: string[] = [];
                const missingDb: string[] = [];

                results.forEach((res, idx) => {
                  const chunkBssids = chunks[idx];
                  if (res.status === 'fulfilled' && res.value) {
                    const { data, unresolved } = res.value;
                    const returnedBssids = new Set(
                      (data || []).map((row: any) => normalizeBssid(row.bssid))
                    );

                    if (Array.isArray(data)) {
                      for (const row of data) {
                        if (row) {
                          hydrated.push(mapApiRowToNetwork(row, 50000 + hydrated.length));
                        }
                      }
                    }

                    for (const bssid of chunkBssids) {
                      const norm = normalizeBssid(bssid);
                      if (!norm) continue;
                      if (!returnedBssids.has(norm)) {
                        const type = unresolved ? unresolved[norm] : undefined;
                        if (type === 'non_renderable') {
                          nonRenderable.push(norm);
                        } else if (type === 'missing') {
                          missingDb.push(norm);
                        } else {
                          missingDb.push(norm);
                        }
                      }
                    }
                  } else {
                    for (const bssid of chunkBssids) {
                      const norm = normalizeBssid(bssid);
                      if (norm) failed.push(norm);
                    }
                    logError(
                      `Batch sibling hydration chunk ${idx} failed`,
                      res.status === 'rejected' ? res.reason : ''
                    );
                  }
                });

                setMissingSiblingNetworks(hydrated);
                setHydrationFailedBssids(failed);
                setNonRenderableBssids(nonRenderable);
                setMissingDbBssids(missingDb);

                logSiblingTopology('useSiblingLinks.hydration', {
                  requested: missing.length,
                  successCount: hydrated.length,
                  failedBssids: failed,
                  hydratedBssids: hydrated.map((n) => normalizeBssid(n.bssid)),
                });
              }
            } catch (err) {
              if (!cancelled) {
                logError('Sibling batch hydration crash', err);
                setMissingSiblingNetworks([]);
                setHydrationFailedBssids(missing);
                setNonRenderableBssids([]);
                setMissingDbBssids([]);
              }
            }
          } else {
            setMissingSiblingNetworks([]);
            setHydrationFailedBssids([]);
            setNonRenderableBssids([]);
            setMissingDbBssids([]);
          }
          return;
        }

        const adjacency = new Map<string, Set<string>>();

        for (const bssid of visibleSet) adjacency.set(bssid, new Set());

        // Check if precomputed sibling_bssids are available on the networks
        const hasPrecomputedSiblings = networks.some(
          (n) => Array.isArray(n.sibling_bssids) && n.sibling_bssids.length > 0
        );

        if (hasPrecomputedSiblings) {
          // Build adjacency locally from precomputed sibling_bssids (NO network requests!)
          for (const network of networks) {
            const anchor = normalizeBssid(network.bssid);
            if (!anchor) continue;

            const siblings = Array.isArray(network.sibling_bssids) ? network.sibling_bssids : [];
            for (const sibling of siblings) {
              const normalizedSibling = normalizeBssid(sibling);
              if (!normalizedSibling) continue;

              addUndirectedEdge(adjacency, anchor, normalizedSibling);
            }
          }
        } else {
          // Fallback: Legacy API requests when precomputed sibling_bssids are missing
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
            const CHUNK_SIZE = 100;
            const chunks: string[][] = [];
            for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
              chunks.push(missing.slice(i, i + CHUNK_SIZE));
            }

            const results = await Promise.allSettled(
              chunks.map((chunk) => networkApi.getNetworksByBssids(chunk))
            );

            if (!cancelled) {
              const hydrated: NetworkRow[] = [];
              const failed: string[] = [];
              const nonRenderable: string[] = [];
              const missingDb: string[] = [];

              results.forEach((res, idx) => {
                const chunkBssids = chunks[idx];
                if (res.status === 'fulfilled' && res.value) {
                  const { data, unresolved } = res.value;
                  const returnedBssids = new Set(
                    (data || []).map((row: any) => normalizeBssid(row.bssid))
                  );

                  if (Array.isArray(data)) {
                    for (const row of data) {
                      if (row) {
                        hydrated.push(mapApiRowToNetwork(row, 50000 + hydrated.length));
                      }
                    }
                  }

                  for (const bssid of chunkBssids) {
                    const norm = normalizeBssid(bssid);
                    if (!norm) continue;
                    if (!returnedBssids.has(norm)) {
                      const type = unresolved ? unresolved[norm] : undefined;
                      if (type === 'non_renderable') {
                        nonRenderable.push(norm);
                      } else if (type === 'missing') {
                        missingDb.push(norm);
                      } else {
                        missingDb.push(norm);
                      }
                    }
                  }
                } else {
                  for (const bssid of chunkBssids) {
                    const norm = normalizeBssid(bssid);
                    if (norm) failed.push(norm);
                  }
                  logError(
                    `Batch sibling hydration chunk ${idx} failed`,
                    res.status === 'rejected' ? res.reason : ''
                  );
                }
              });

              setMissingSiblingNetworks(hydrated);
              setHydrationFailedBssids(failed);
              setNonRenderableBssids(nonRenderable);
              setMissingDbBssids(missingDb);

              logSiblingTopology('useSiblingLinks.hydration', {
                requested: missing.length,
                successCount: hydrated.length,
                failedBssids: failed,
                hydratedBssids: hydrated.map((n) => normalizeBssid(n.bssid)),
              });
            }
          } catch (err) {
            if (!cancelled) {
              logError('Sibling batch hydration crash', err);
              setMissingSiblingNetworks([]);
              setHydrationFailedBssids(missing);
              setNonRenderableBssids([]);
              setMissingDbBssids([]);
            }
          }
        } else {
          setMissingSiblingNetworks([]);
          setHydrationFailedBssids([]);
          setNonRenderableBssids([]);
          setMissingDbBssids([]);
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
    nonRenderableBssids,
    missingDbBssids,
  };
};

import type { NetworkRow } from '../../../types/network';

export function normalizeBssid(value: unknown): string {
  return String(value || '')
    .trim()
    .toUpperCase();
}

export function addUndirectedEdge(
  adjacency: Map<string, Set<string>>,
  aRaw: unknown,
  bRaw: unknown
): void {
  const a = normalizeBssid(aRaw);
  const b = normalizeBssid(bRaw);
  if (!a || !b || a === b) return;
  if (!adjacency.has(a)) adjacency.set(a, new Set());
  if (!adjacency.has(b)) adjacency.set(b, new Set());
  adjacency.get(a)?.add(b);
  adjacency.get(b)?.add(a);
}

/**
 * Connected components (size >= 2) seeded from visible BSSIDs.
 * Off-list nodes are included when reachable via adjacency edges.
 */
export function buildSiblingGroupMap(
  visibleSet: Set<string>,
  adjacency: Map<string, Set<string>>
): Map<string, string> {
  const groupMap = new Map<string, string>();
  const visited = new Set<string>();
  let groupCounter = 1;

  const sortedVisible = Array.from(visibleSet).sort();
  for (const start of sortedVisible) {
    if (visited.has(start)) continue;
    const neighbors = adjacency.get(start);
    if (!neighbors || neighbors.size === 0) continue;

    const stack = [start];
    const component: string[] = [];
    while (stack.length > 0) {
      const current = stack.pop() as string;
      if (visited.has(current)) continue;
      visited.add(current);
      component.push(current);
      for (const next of adjacency.get(current) || []) {
        if (!visited.has(next)) stack.push(next);
      }
    }

    if (component.length < 2) continue;
    const groupId = `S${groupCounter}`;
    groupCounter += 1;
    for (const bssid of component) groupMap.set(bssid, groupId);
  }

  return groupMap;
}

export function serializeGroupMap(groupMap: Map<string, string>): string {
  return [...groupMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bssid, gid]) => `${bssid}:${gid}`)
    .join('|');
}

/**
 * When a quick-search is active, include every member of a sibling group if any member
 * matched the API filter (present in `searchResultNetworks`).
 */
export function expandNetworksForSiblingSearch(
  searchResultNetworks: NetworkRow[],
  missingSiblingNetworks: NetworkRow[],
  visibleSiblingGroupMap: Map<string, string>,
  quickSearch: string
): NetworkRow[] {
  const searchHits = new Set(
    searchResultNetworks.map((n) => normalizeBssid(n.bssid)).filter(Boolean)
  );

  const includeBssids = new Set(searchHits);
  const hasSearch = quickSearch.trim().length > 0;

  if (hasSearch && visibleSiblingGroupMap.size > 0 && searchHits.size > 0) {
    const groupsWithHit = new Set<string>();
    for (const bssid of searchHits) {
      const gid = visibleSiblingGroupMap.get(bssid);
      if (gid) groupsWithHit.add(gid);
    }
    for (const [bssid, gid] of visibleSiblingGroupMap) {
      if (groupsWithHit.has(gid)) includeBssids.add(bssid);
    }
  } else if (!hasSearch) {
    for (const bssid of visibleSiblingGroupMap.keys()) includeBssids.add(bssid);
  }

  const byBssid = new Map<string, NetworkRow>();
  for (const net of searchResultNetworks) {
    const bssid = normalizeBssid(net.bssid);
    if (!bssid) continue;
    if (!hasSearch || includeBssids.has(bssid)) byBssid.set(bssid, net);
  }

  for (const net of missingSiblingNetworks) {
    const bssid = normalizeBssid(net.bssid);
    if (!bssid || byBssid.has(bssid)) continue;
    if (!hasSearch || includeBssids.has(bssid)) byBssid.set(bssid, net);
  }

  if (!hasSearch) {
    let allNetworks = searchResultNetworks;
    if (missingSiblingNetworks.length > 0) {
      const loaded = new Set(searchResultNetworks.map((n) => normalizeBssid(n.bssid)));
      const extras = missingSiblingNetworks.filter(
        (n) => n.bssid && !loaded.has(normalizeBssid(n.bssid))
      );
      if (extras.length > 0) allNetworks = [...searchResultNetworks, ...extras];
    }
    return regroupSiblingNetworks(allNetworks, visibleSiblingGroupMap);
  }

  const expanded: NetworkRow[] = [];
  for (const bssid of includeBssids) {
    const row = byBssid.get(bssid);
    if (row) expanded.push(row);
  }

  if (visibleSiblingGroupMap.size === 0) return expanded;
  return regroupSiblingNetworks(expanded, visibleSiblingGroupMap);
}

export function regroupSiblingNetworks(
  networks: NetworkRow[],
  visibleSiblingGroupMap: Map<string, string>
): NetworkRow[] {
  if (visibleSiblingGroupMap.size === 0) return networks;

  const grouped: NetworkRow[] = [];
  const emitted = new Set<string>();

  for (const net of networks) {
    const bssid = normalizeBssid(net.bssid);
    const gid = bssid ? visibleSiblingGroupMap.get(bssid) : undefined;
    if (!gid) {
      grouped.push(net);
      continue;
    }
    if (emitted.has(gid)) continue;
    emitted.add(gid);
    networks
      .filter((n) => {
        const nb = normalizeBssid(n.bssid);
        return nb && visibleSiblingGroupMap.get(nb) === gid;
      })
      .forEach((n) => grouped.push(n));
  }

  return grouped;
}

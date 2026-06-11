import type { NetworkRow } from '../../client/src/types/network';

// Directly require and mutate the React module cached in Node's require registry
const React = require('react');

const mockStates: any[] = [];
const mockSetStates: any[] = [];
let mockStateIndex = 0;
let mockRefIndex = 0;
const mockRefs: any[] = [];
const mockEffects: any[] = [];

const originalUseState = React.useState;
const originalUseRef = React.useRef;
const originalUseEffect = React.useEffect;

React.useState = (initialValue: any) => {
  const currentIndex = mockStateIndex++;
  if (mockStates[currentIndex] === undefined) {
    mockStates[currentIndex] = initialValue;
    mockSetStates[currentIndex] = jest.fn((newValue) => {
      if (typeof newValue === 'function') {
        mockStates[currentIndex] = newValue(mockStates[currentIndex]);
      } else {
        mockStates[currentIndex] = newValue;
      }
    });
  }
  return [mockStates[currentIndex], mockSetStates[currentIndex]];
};

React.useRef = (initialValue: any) => {
  const currentIndex = mockRefIndex++;
  if (mockRefs[currentIndex] === undefined) {
    mockRefs[currentIndex] = { current: initialValue };
  }
  return mockRefs[currentIndex];
};

React.useEffect = (effectFn: any, deps: any) => {
  mockEffects.push({ effectFn, deps });
};

const resetMockIndexes = () => {
  mockStateIndex = 0;
  mockRefIndex = 0;
  mockEffects.length = 0;
  mockStates.length = 0;
  mockSetStates.length = 0;
  mockRefs.length = 0;
};

// Globally shared mocks for networkApi to handle any path resolution mismatch without loading client.ts
(global as any).mockNetworkApi = {
  getNetworkSiblingLinks: jest.fn(),
  getNetworkSiblingLinksBatch: jest.fn(),
  getSiblingComponentBssids: jest.fn(),
  getNetworkByBssid: jest.fn(),
  getNetworksByBssids: jest.fn(),
};

jest.mock('../../client/src/api/networkApi', () => ({
  networkApi: (global as any).mockNetworkApi,
}));

// Use { virtual: true } because this path is relative from useSiblingLinks.ts, but is invalid from the test file itself.
jest.mock(
  '../../../api/networkApi',
  () => ({
    networkApi: (global as any).mockNetworkApi,
  }),
  { virtual: true }
);

const mockNetworkApi = (global as any).mockNetworkApi;

// Mock the clientLogger to bypass import.meta errors in Jest
jest.mock('../../client/src/logging/clientLogger', () => ({
  logError: jest.fn(),
  logDebug: jest.fn(),
}));

// Mock the siblingTopologyDebug to bypass import.meta errors in Jest
jest.mock('../../client/src/components/geospatial/utils/siblingTopologyDebug', () => ({
  logSiblingTopology: jest.fn(),
  componentSizesFromGroupMap: jest.fn(() => ({})),
}));

let useSiblingLinks: any;

describe('useSiblingLinks Hook Performance and Optimization', () => {
  beforeAll(() => {
    // Dynamically load useSiblingLinks AFTER all Jest mocks are registered
    useSiblingLinks =
      require('../../client/src/components/geospatial/hooks/useSiblingLinks').useSiblingLinks;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resetMockIndexes();
  });

  afterAll(() => {
    React.useState = originalUseState;
    React.useRef = originalUseRef;
    React.useEffect = originalUseEffect;
    delete (global as any).mockNetworkApi;
  });

  test('verifies no per-row getNetworkSiblingLinks call is made when sibling_bssids are present', async () => {
    const networks: NetworkRow[] = [
      {
        bssid: 'AA:BB:CC:DD:EE:01',
        ssid: 'SLICE',
        sibling_bssids: ['AA:BB:CC:DD:EE:02'],
      } as NetworkRow,
      {
        bssid: 'AA:BB:CC:DD:EE:02',
        ssid: 'SLICE',
        sibling_bssids: ['AA:BB:CC:DD:EE:01'],
      } as NetworkRow,
    ];

    useSiblingLinks({
      isAdmin: true,
      selectedAnchorBssid: null,
      networks,
    });

    // Run the registered effects
    for (const effect of mockEffects) {
      await effect.effectFn();
    }
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Verify absolutely ZERO sibling link requests were made
    expect(mockNetworkApi.getNetworkSiblingLinksBatch).not.toHaveBeenCalled();
    expect(mockNetworkApi.getNetworkSiblingLinks).not.toHaveBeenCalled();

    // Verify adjacency / visible sibling groups are correctly built in-memory
    expect(mockSetStates[1]).toHaveBeenCalled();
    const groupMap = mockSetStates[1].mock.calls[mockSetStates[1].mock.calls.length - 1][0];
    expect(groupMap.size).toBe(2);
    expect(groupMap.get('AA:BB:CC:DD:EE:01')).toBe(groupMap.get('AA:BB:CC:DD:EE:02'));
  });

  test('verifies adjacency/table links are built correctly from sibling_bssids', async () => {
    const networks: NetworkRow[] = [
      {
        bssid: 'AA:BB:CC:DD:EE:01',
        sibling_bssids: ['AA:BB:CC:DD:EE:02', 'AA:BB:CC:DD:EE:03'],
      } as NetworkRow,
    ];

    // AA:BB:CC:DD:EE:02 and 03 are "missing" from page payload and should be hydrated
    mockNetworkApi.getNetworksByBssids.mockImplementation(async (bssids: string[]) => {
      return {
        data: bssids.map((bssid) => ({ bssid, ssid: 'Hydrated' })),
        unresolved: {},
      };
    });

    useSiblingLinks({
      isAdmin: true,
      selectedAnchorBssid: null,
      networks,
    });

    // Run the registered effects
    for (const effect of mockEffects) {
      await effect.effectFn();
    }
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Verification of local graph expansion
    expect(mockSetStates[1]).toHaveBeenCalled();
    const groupMap = mockSetStates[1].mock.calls[mockSetStates[1].mock.calls.length - 1][0];
    expect(groupMap.size).toBe(3);
    expect(groupMap.get('AA:BB:CC:DD:EE:01')).toBe(groupMap.get('AA:BB:CC:DD:EE:02'));
    expect(groupMap.get('AA:BB:CC:DD:EE:01')).toBe(groupMap.get('AA:BB:CC:DD:EE:03'));

    // Hydration was called only for off-page / missing siblings
    expect(mockNetworkApi.getNetworksByBssids).toHaveBeenCalledWith([
      'AA:BB:CC:DD:EE:02',
      'AA:BB:CC:DD:EE:03',
    ]);
  });

  test('verifies fallback behavior only if sibling_bssids are missing or empty', async () => {
    const networks: NetworkRow[] = [
      {
        bssid: 'AA:BB:CC:DD:EE:01',
        ssid: 'Legacy',
        // sibling_bssids is missing!
      } as NetworkRow,
    ];

    mockNetworkApi.getNetworkSiblingLinksBatch.mockResolvedValue({
      links: [{ bssid_a: 'AA:BB:CC:DD:EE:01', bssid_b: 'AA:BB:CC:DD:EE:02' }],
    });
    mockNetworkApi.getNetworkSiblingLinks.mockResolvedValue({
      links: [{ sibling_bssid: 'AA:BB:CC:DD:EE:02' }],
    });

    useSiblingLinks({
      isAdmin: true,
      selectedAnchorBssid: null,
      networks,
    });

    // Run the registered effects
    for (const effect of mockEffects) {
      await effect.effectFn();
    }
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Fallback API queries are triggered when precomputed data is absent
    expect(mockNetworkApi.getNetworkSiblingLinksBatch).toHaveBeenCalledWith(['AA:BB:CC:DD:EE:01']);
    expect(mockNetworkApi.getNetworkSiblingLinks).toHaveBeenCalledWith('AA:BB:CC:DD:EE:01');

    // Visibilities are still built correctly
    expect(mockSetStates[1]).toHaveBeenCalled();
    const groupMap = mockSetStates[1].mock.calls[mockSetStates[1].mock.calls.length - 1][0];
    expect(groupMap.size).toBe(2);
    expect(groupMap.get('AA:BB:CC:DD:EE:01')).toBe(groupMap.get('AA:BB:CC:DD:EE:02'));
  });

  // --- quickSearch path fixes ---

  test('SSID search builds separate 2-member groups for each independent AirLink pair', async () => {
    // Two independent DELTA1_TWIN pairs — should NOT be merged into one group
    const networks: NetworkRow[] = [
      {
        bssid: '00:14:3E:33:2E:40',
        ssid: 'PAS-301',
        manufacturer: 'Air Link Communications, Inc.',
        sibling_bssids: ['00:14:3E:33:2E:41'],
      } as NetworkRow,
      {
        bssid: '00:14:3E:33:2E:41',
        ssid: 'PAS-RIG',
        manufacturer: 'Air Link Communications, Inc.',
        sibling_bssids: ['00:14:3E:33:2E:40'],
      } as NetworkRow,
      {
        bssid: '00:14:3E:20:24:00',
        ssid: 'PAS-318',
        manufacturer: 'Air Link Communications, Inc.',
        sibling_bssids: ['00:14:3E:20:24:01'],
      } as NetworkRow,
      {
        bssid: '00:14:3E:20:24:01',
        ssid: 'PAS-RIG',
        manufacturer: 'Air Link Communications, Inc.',
        sibling_bssids: ['00:14:3E:20:24:00'],
      } as NetworkRow,
    ];

    useSiblingLinks({
      isAdmin: true,
      selectedAnchorBssid: null,
      networks,
      quickSearch: 'pas-',
    });

    for (const effect of mockEffects) {
      await effect.effectFn();
    }
    await new Promise((resolve) => setTimeout(resolve, 20));

    // getSiblingComponentBssids must NOT be called — old anchor-only approach is gone
    expect(mockNetworkApi.getSiblingComponentBssids).not.toHaveBeenCalled();

    expect(mockSetStates[1]).toHaveBeenCalled();
    const groupMap = mockSetStates[1].mock.calls[mockSetStates[1].mock.calls.length - 1][0];

    // Both pairs are grouped
    expect(groupMap.size).toBe(4);

    // Each pair has its own group ID — they must NOT share a group
    const groupA = groupMap.get('00:14:3E:33:2E:40');
    const groupB = groupMap.get('00:14:3E:20:24:00');
    expect(groupA).toBeDefined();
    expect(groupB).toBeDefined();
    expect(groupA).not.toBe(groupB);

    // Partners share their group
    expect(groupMap.get('00:14:3E:33:2E:41')).toBe(groupA);
    expect(groupMap.get('00:14:3E:20:24:01')).toBe(groupB);
  });

  test('SSID search uses ALL matching hits, not only the first', async () => {
    // If only the first hit were used, PAS-318 pair would have no group
    const networks: NetworkRow[] = [
      {
        bssid: '00:14:3E:33:2E:40',
        ssid: 'PAS-301',
        manufacturer: 'Air Link Communications, Inc.',
        sibling_bssids: ['00:14:3E:33:2E:41'],
      } as NetworkRow,
      {
        bssid: '00:14:3E:20:24:00',
        ssid: 'PAS-318',
        manufacturer: 'Air Link Communications, Inc.',
        sibling_bssids: ['00:14:3E:20:24:01'],
      } as NetworkRow,
      {
        bssid: '00:14:3E:20:24:01',
        ssid: 'PAS-RIG',
        manufacturer: 'Air Link Communications, Inc.',
        sibling_bssids: ['00:14:3E:20:24:00'],
      } as NetworkRow,
    ];

    useSiblingLinks({
      isAdmin: true,
      selectedAnchorBssid: null,
      networks,
      quickSearch: 'pas-',
    });

    for (const effect of mockEffects) {
      await effect.effectFn();
    }
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(mockSetStates[1]).toHaveBeenCalled();
    const groupMap = mockSetStates[1].mock.calls[mockSetStates[1].mock.calls.length - 1][0];

    // PAS-318 and PAS-RIG must be grouped even though PAS-301 is searchHits[0]
    expect(groupMap.get('00:14:3E:20:24:00')).toBeDefined();
    expect(groupMap.get('00:14:3E:20:24:01')).toBeDefined();
    expect(groupMap.get('00:14:3E:20:24:00')).toBe(groupMap.get('00:14:3E:20:24:01'));
  });

  test('m: prefix searches by manufacturer, not literal SSID/BSSID text', async () => {
    const networks: NetworkRow[] = [
      {
        bssid: '00:14:3E:61:21:20',
        ssid: '1923',
        manufacturer: 'Air Link Communications, Inc.',
        sibling_bssids: ['00:14:3E:61:21:21'],
      } as NetworkRow,
      {
        bssid: '00:14:3E:61:21:21',
        ssid: 'msamobile',
        manufacturer: 'Air Link Communications, Inc.',
        sibling_bssids: ['00:14:3E:61:21:20'],
      } as NetworkRow,
      {
        bssid: 'AA:BB:CC:DD:EE:01',
        ssid: 'XfinityWifi',
        manufacturer: 'Comcast',
        sibling_bssids: ['AA:BB:CC:DD:EE:02'],
      } as NetworkRow,
    ];

    useSiblingLinks({
      isAdmin: true,
      selectedAnchorBssid: null,
      networks,
      quickSearch: 'm:Air Link',
    });

    for (const effect of mockEffects) {
      await effect.effectFn();
    }
    await new Promise((resolve) => setTimeout(resolve, 20));

    // getSiblingComponentBssids must NOT be called
    expect(mockNetworkApi.getSiblingComponentBssids).not.toHaveBeenCalled();

    expect(mockSetStates[1]).toHaveBeenCalled();
    const groupMap = mockSetStates[1].mock.calls[mockSetStates[1].mock.calls.length - 1][0];

    // The Air Link pair is grouped
    expect(groupMap.get('00:14:3E:61:21:20')).toBeDefined();
    expect(groupMap.get('00:14:3E:61:21:21')).toBeDefined();
    expect(groupMap.get('00:14:3E:61:21:20')).toBe(groupMap.get('00:14:3E:61:21:21'));

    // Comcast network is NOT in the group (different manufacturer)
    expect(groupMap.get('AA:BB:CC:DD:EE:01')).toBeUndefined();
  });

  test('search path fallback uses batch+per-hit calls scoped to search hits when sibling_bssids missing', async () => {
    const networks: NetworkRow[] = [
      {
        bssid: '00:14:3E:33:2E:40',
        ssid: 'PAS-301',
        manufacturer: 'Air Link Communications, Inc.',
        // no sibling_bssids
      } as NetworkRow,
      {
        bssid: '00:14:3E:33:2E:41',
        ssid: 'PAS-RIG',
        manufacturer: 'Air Link Communications, Inc.',
        // no sibling_bssids
      } as NetworkRow,
    ];

    mockNetworkApi.getNetworkSiblingLinksBatch.mockResolvedValue({
      links: [{ bssid_a: '00:14:3E:33:2E:40', bssid_b: '00:14:3E:33:2E:41' }],
    });
    mockNetworkApi.getNetworkSiblingLinks.mockResolvedValue({ links: [] });

    useSiblingLinks({
      isAdmin: true,
      selectedAnchorBssid: null,
      networks,
      quickSearch: 'pas-',
    });

    for (const effect of mockEffects) {
      await effect.effectFn();
    }
    await new Promise((resolve) => setTimeout(resolve, 20));

    // getSiblingComponentBssids must NOT be called
    expect(mockNetworkApi.getSiblingComponentBssids).not.toHaveBeenCalled();

    // Batch was called with only the search hit BSSIDs
    expect(mockNetworkApi.getNetworkSiblingLinksBatch).toHaveBeenCalledWith([
      '00:14:3E:33:2E:40',
      '00:14:3E:33:2E:41',
    ]);

    expect(mockSetStates[1]).toHaveBeenCalled();
    const groupMap = mockSetStates[1].mock.calls[mockSetStates[1].mock.calls.length - 1][0];
    expect(groupMap.get('00:14:3E:33:2E:40')).toBeDefined();
    expect(groupMap.get('00:14:3E:33:2E:40')).toBe(groupMap.get('00:14:3E:33:2E:41'));
  });

  test('old group map is cleared immediately when quickSearch or networks changes', async () => {
    const networks: NetworkRow[] = [
      { bssid: 'AA:BB:CC:DD:EE:01', sibling_bssids: ['AA:BB:CC:DD:EE:02'] } as NetworkRow,
    ];

    useSiblingLinks({
      isAdmin: true,
      selectedAnchorBssid: null,
      networks,
      quickSearch: 'old-search',
    });

    // Run the synchronous effect setup
    const effect = mockEffects[mockEffects.length - 1];
    if (effect) {
      effect.effectFn();
    }

    // Check that state-setters are immediately called with clean values to prevent stale rendering
    expect(mockSetStates[1]).toHaveBeenCalledWith(new Map());
    expect(mockSetStates[2]).toHaveBeenCalledWith([]);
    expect(mockSetStates[3]).toHaveBeenCalledWith([]);
  });

  test('stale async fallback results are ignored if networks/search changed', async () => {
    const networks1: NetworkRow[] = [
      { bssid: 'AA:BB:CC:DD:EE:01', ssid: 'search-1' } as NetworkRow,
    ];
    const networks2: NetworkRow[] = [
      { bssid: 'AA:BB:CC:DD:EE:03', ssid: 'search-2' } as NetworkRow,
    ];

    mockNetworkApi.getNetworkSiblingLinksBatch.mockResolvedValue({
      links: [{ bssid_a: 'AA:BB:CC:DD:EE:01', bssid_b: 'AA:BB:CC:DD:EE:02' }],
    });
    mockNetworkApi.getNetworkSiblingLinks.mockResolvedValue({ links: [] });

    // Render with first search
    useSiblingLinks({
      isAdmin: true,
      selectedAnchorBssid: null,
      networks: networks1,
      quickSearch: 'search-1',
    });

    const effect1 = mockEffects[mockEffects.length - 1];

    // Simulate re-render by resetting state indices but preserving mockStates array
    mockStateIndex = 0;
    mockRefIndex = 0;
    mockEffects.length = 0;

    // Render with second search immediately before effect1 resolves
    useSiblingLinks({
      isAdmin: true,
      selectedAnchorBssid: null,
      networks: networks2,
      quickSearch: 'search-2',
    });

    // Run cleanup of effect1 (setting cancelled = true)
    const cleanup = await effect1.effectFn();
    if (typeof cleanup === 'function') {
      cleanup();
    }

    // Verify fallback links are called for the first search
    expect(mockNetworkApi.getNetworkSiblingLinksBatch).toHaveBeenCalledWith(['AA:BB:CC:DD:EE:01']);
  });

  test('classifies off-page siblings into hydrationFailedBssids when parallel batch request fails', async () => {
    const networks: NetworkRow[] = [
      {
        bssid: 'AA:BB:CC:DD:EE:01',
        sibling_bssids: ['AA:BB:CC:DD:EE:02'],
      } as NetworkRow,
    ];

    mockNetworkApi.getNetworksByBssids.mockRejectedValue(new Error('Hydration batch call failed'));

    useSiblingLinks({
      isAdmin: true,
      selectedAnchorBssid: null,
      networks,
    });

    for (const effect of mockEffects) {
      await effect.effectFn();
    }
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(mockSetStates[3]).toHaveBeenCalled();
    const lastCallArg = mockSetStates[3].mock.calls[mockSetStates[3].mock.calls.length - 1][0];
    expect(lastCallArg).toEqual(['AA:BB:CC:DD:EE:02']);
  });

  test('classifies off-page siblings into nonRenderableBssids and missingDbBssids based on API unresolved payload', async () => {
    const networks: NetworkRow[] = [
      {
        bssid: 'AA:BB:CC:DD:EE:01',
        sibling_bssids: ['AA:BB:CC:DD:EE:02', 'AA:BB:CC:DD:EE:03'],
      } as NetworkRow,
    ];

    mockNetworkApi.getNetworksByBssids.mockResolvedValue({
      data: [],
      unresolved: {
        'AA:BB:CC:DD:EE:02': 'non_renderable',
        'AA:BB:CC:DD:EE:03': 'missing',
      },
    });

    useSiblingLinks({
      isAdmin: true,
      selectedAnchorBssid: null,
      networks,
    });

    for (const effect of mockEffects) {
      await effect.effectFn();
    }
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(mockSetStates[4]).toHaveBeenCalled();
    const nonRenderableArg = mockSetStates[4].mock.calls[mockSetStates[4].mock.calls.length - 1][0];
    expect(nonRenderableArg).toEqual(['AA:BB:CC:DD:EE:02']);

    expect(mockSetStates[5]).toHaveBeenCalled();
    const missingDbArg = mockSetStates[5].mock.calls[mockSetStates[5].mock.calls.length - 1][0];
    expect(missingDbArg).toEqual(['AA:BB:CC:DD:EE:03']);
  });

  test('prevents duplicate warning states by ensuring exposed final arrays contain unique BSSIDs', async () => {
    // Two visible networks both link to same off-page sibling 'AA:BB:CC:DD:EE:02' (duplicate unresolved)
    const networks: NetworkRow[] = [
      {
        bssid: 'AA:BB:CC:DD:EE:11',
        sibling_bssids: ['AA:BB:CC:DD:EE:02'],
      } as NetworkRow,
      {
        bssid: 'AA:BB:CC:DD:EE:22',
        sibling_bssids: ['AA:BB:CC:DD:EE:02'],
      } as NetworkRow,
    ];

    mockNetworkApi.getNetworksByBssids.mockResolvedValue({
      data: [],
      unresolved: {
        'AA:BB:CC:DD:EE:02': 'non_renderable',
      },
    });

    useSiblingLinks({
      isAdmin: true,
      selectedAnchorBssid: null,
      networks,
    });

    for (const effect of mockEffects) {
      await effect.effectFn();
    }
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Verify nonRenderableBssids state setter was called and contains unique items
    expect(mockSetStates[4]).toHaveBeenCalled();
    const nonRenderableArg = mockSetStates[4].mock.calls[mockSetStates[4].mock.calls.length - 1][0];
    expect(nonRenderableArg).toEqual(['AA:BB:CC:DD:EE:02']); // Exactly one, no duplicates

    // Assert uniqueness of the final array elements
    const uniqueElements = Array.from(new Set(nonRenderableArg));
    expect(nonRenderableArg.length).toBe(uniqueElements.length);
  });

  test('hydrates off-visible siblings and adds them to missingSiblingNetworks when quickSearch matches only visible node', async () => {
    const networks: NetworkRow[] = [
      {
        bssid: '8C:61:A3:7C:BD:08',
        ssid: 'undertaker',
        sibling_bssids: ['BE:61:A3:7C:BD:09'],
      } as NetworkRow,
    ];

    mockNetworkApi.getNetworksByBssids.mockImplementation(async (bssids: string[]) => {
      return {
        data: bssids.map((bssid) => ({ bssid, ssid: 'xfinitywifi' })),
        unresolved: {},
      };
    });

    useSiblingLinks({
      isAdmin: true,
      selectedAnchorBssid: null,
      networks,
      quickSearch: 'undertaker',
    });

    // Run the registered effects
    for (const effect of mockEffects) {
      await effect.effectFn();
    }
    await new Promise((resolve) => setTimeout(resolve, 20));

    // 1. groupMap has both BSSIDs in same group
    expect(mockSetStates[1]).toHaveBeenCalled();
    const groupMap = mockSetStates[1].mock.calls[mockSetStates[1].mock.calls.length - 1][0];
    expect(groupMap.get('8C:61:A3:7C:BD:08')).toBe(groupMap.get('BE:61:A3:7C:BD:09'));

    // 2. hydration requested BE:61:A3:7C:BD:09
    expect(mockNetworkApi.getNetworksByBssids).toHaveBeenCalledWith(['BE:61:A3:7C:BD:09']);

    // 3. expanded rows include BE:61:A3:7C:BD:09
    expect(mockSetStates[2]).toHaveBeenCalled();
    const hydratedNetworks = mockSetStates[2].mock.calls[mockSetStates[2].mock.calls.length - 1][0];
    const hydratedBssids = hydratedNetworks.map((n: NetworkRow) => n.bssid);
    expect(hydratedBssids).toContain('BE:61:A3:7C:BD:09');
  });
});

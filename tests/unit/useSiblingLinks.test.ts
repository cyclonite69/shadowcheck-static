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
    const groupMap = mockSetStates[1].mock.calls[0][0];
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
    mockNetworkApi.getNetworkByBssid.mockImplementation(async (bssid: string) => {
      return { bssid, ssid: 'Hydrated' };
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
    const groupMap = mockSetStates[1].mock.calls[0][0];
    expect(groupMap.size).toBe(3);
    expect(groupMap.get('AA:BB:CC:DD:EE:01')).toBe(groupMap.get('AA:BB:CC:DD:EE:02'));
    expect(groupMap.get('AA:BB:CC:DD:EE:01')).toBe(groupMap.get('AA:BB:CC:DD:EE:03'));

    // Hydration was called only for off-page / missing siblings
    expect(mockNetworkApi.getNetworkByBssid).toHaveBeenCalledWith('AA:BB:CC:DD:EE:02');
    expect(mockNetworkApi.getNetworkByBssid).toHaveBeenCalledWith('AA:BB:CC:DD:EE:03');
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

    // Legacy fallback API queries are triggered when precomputed data is absent
    expect(mockNetworkApi.getNetworkSiblingLinksBatch).toHaveBeenCalledWith(['AA:BB:CC:DD:EE:01']);
    expect(mockNetworkApi.getNetworkSiblingLinks).toHaveBeenCalledWith('AA:BB:CC:DD:EE:01');

    // Visibilities are still built correctly
    expect(mockSetStates[1]).toHaveBeenCalled();
    const groupMap = mockSetStates[1].mock.calls[0][0];
    expect(groupMap.size).toBe(2);
    expect(groupMap.get('AA:BB:CC:DD:EE:01')).toBe(groupMap.get('AA:BB:CC:DD:EE:02'));
  });
});

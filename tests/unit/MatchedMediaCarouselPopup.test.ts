import React from 'react';
import { networkApi } from '../../client/src/api/networkApi';

// Mock React hooks registry to intercept and assert states/effects logically in Node
const mockStates: any[] = [];
const mockSetStates: any[] = [];
let mockStateIndex = 0;
let mockRefIndex = 0;
const mockRefs: any[] = [];
const mockEffects: any[] = [];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Override React properties directly with vanilla functions (immune to resetMocks)
(React as any).useState = (initialValue: any) => {
  const currentIndex = mockStateIndex++;
  if (mockStates[currentIndex] === undefined) {
    mockStates[currentIndex] = initialValue;
    const setStateFn = (newValue: any) => {
      if (typeof newValue === 'function') {
        mockStates[currentIndex] = newValue(mockStates[currentIndex]);
      } else {
        mockStates[currentIndex] = newValue;
      }
      setStateFn.calls.push([newValue]);
    };
    setStateFn.calls = [] as any[][];
    mockSetStates[currentIndex] = setStateFn;
  }
  return [mockStates[currentIndex], mockSetStates[currentIndex]];
};

(React as any).useRef = (initialValue: any) => {
  const currentIndex = mockRefIndex++;
  if (mockRefs[currentIndex] === undefined) {
    mockRefs[currentIndex] = { current: initialValue };
  }
  return mockRefs[currentIndex];
};

(React as any).useEffect = (effectFn: any) => {
  mockEffects.push({ effectFn });
};

(React as any).useMemo = (factory: () => any) => {
  return factory();
};

import { MatchedMediaCarouselPopup } from '../../client/src/components/geospatial/media/MatchedMediaCarouselPopup';

jest.mock('../../client/src/api/networkApi', () => ({
  networkApi: {
    getNetworkMedia: jest.fn(),
  },
}));

describe('MatchedMediaCarouselPopup logical tests', () => {
  beforeEach(() => {
    mockStateIndex = 0;
    mockRefIndex = 0;
    mockEffects.length = 0;
    mockStates.length = 0;
    mockSetStates.length = 0;
    mockRefs.length = 0;
    (globalThis as any).window = { open: jest.fn() };
    (networkApi.getNetworkMedia as jest.Mock).mockReset();
  });

  afterEach(() => {
    delete (globalThis as any).window;
  });

  it('initializes state and registers network load effect', async () => {
    const mockMedia = [
      {
        id: 101,
        source_bssid: 'AA:BB:CC:DD:EE:FF',
        inline_url: '/inline/101',
        exif_captured_at: '2026-06-22T08:00:00Z',
      },
    ];
    (networkApi.getNetworkMedia as jest.Mock).mockResolvedValue(mockMedia);

    // Call the component function directly
    const result = MatchedMediaCarouselPopup({
      memberBssids: ['AA:BB:CC:DD:EE:FF'],
      mediaIds: [101],
      markerLocationSource: 'observation',
      observationId: 2001,
      captureLat: 43.02,
      captureLon: -83.69,
      observationLat: 43.02,
      observationLon: -83.69,
      networkLat: null,
      networkLon: null,
    });

    expect(result).toBeDefined();
    // Verify useEffect is registered (we have useEffects for loading, focus, etc.)
    expect(mockEffects.length).toBeGreaterThan(0);

    // Trigger loader effect (which is the first effect, index 0)
    const loadEffect = mockEffects[0];
    loadEffect.effectFn();

    // Await promise microtask queue flush
    await sleep(10);

    // Verify media load API called
    expect(networkApi.getNetworkMedia).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
  });

  it('deduplicates and sorts media items by mediaIds priority, then timestamp fallback', async () => {
    const mockMediaBssids = [
      [
        {
          id: 102,
          source_bssid: 'AA:BB:CC:DD:EE:FF',
          created_at: '2026-06-22T08:30:00Z',
          inline_url: '/inline/102',
        },
        {
          id: 101,
          source_bssid: 'AA:BB:CC:DD:EE:FF',
          created_at: '2026-06-22T08:00:00Z',
          inline_url: '/inline/101',
        },
      ],
      [
        {
          id: 101,
          source_bssid: 'AA:BB:CC:DD:EE:FE',
          created_at: '2026-06-22T08:00:00Z',
          inline_url: '/inline/101',
        },
        {
          id: 103,
          source_bssid: 'AA:BB:CC:DD:EE:FE',
          created_at: '2026-06-22T09:00:00Z',
          inline_url: '/inline/103',
        },
      ],
    ];

    (networkApi.getNetworkMedia as jest.Mock)
      .mockResolvedValueOnce(mockMediaBssids[0])
      .mockResolvedValueOnce(mockMediaBssids[1]);

    const _result = MatchedMediaCarouselPopup({
      memberBssids: ['AA:BB:CC:DD:EE:FF', 'AA:BB:CC:DD:EE:FE'],
      mediaIds: [101, 102],
      markerLocationSource: 'observation',
      observationId: 2001,
      captureLat: 43.02,
      captureLon: -83.69,
      observationLat: 43.02,
      observationLon: -83.69,
      networkLat: null,
      networkLon: null,
    });

    // Trigger loading effect (index 0)
    const loadEffect = mockEffects[0];
    loadEffect.effectFn();

    // Await promise microtask queue flush
    await sleep(10);

    // The component sets items state (which is the first state variable, index 0)
    const setItemsMock = mockSetStates[0];
    expect(setItemsMock.calls.length).toBeGreaterThan(0);

    // Retrieve the items passed to setItemsMock
    const passedItems = setItemsMock.calls[0][0];
    expect(passedItems.length).toBe(3); // 101, 102, 103

    // Verify ordering priority (101 first, then 102, then 103)
    expect(passedItems[0].id).toBe(101);
    expect(passedItems[1].id).toBe(102);
    expect(passedItems[2].id).toBe(103);
  });
});

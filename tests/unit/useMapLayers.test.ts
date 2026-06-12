// Mock React's useCallback to return the function directly, allowing us to test without React renderHook
jest.mock('react', () => ({
  useCallback: (fn: any) => fn,
}));

// Stub browser globals that mapbox-gl or transitive dependencies expect
if (typeof (global as any).document === 'undefined') {
  (global as any).document = {
    createElement: () => ({}),
  };
}
if (typeof (global as any).window === 'undefined') {
  (global as any).window = {
    document: (global as any).document,
  };
}

import { useMapLayers } from '../../client/src/components/geospatial/hooks/useMapLayers';

describe('useMapLayers', () => {
  it('adds base sources and layers including media highlight', () => {
    // Invoke hook as a plain function since we mocked useCallback
    const { addBaseSourcesAndLayers } = useMapLayers();

    const addedLayers: any[] = [];
    const addedSources: Record<string, any> = {};

    const mockMap: any = {
      addSource: jest.fn((id, config) => {
        addedSources[id] = config;
      }),
      addLayer: jest.fn((config) => {
        addedLayers.push(config);
      }),
      getSource: jest.fn((id) => addedSources[id]),
      getLayer: jest.fn((id) => addedLayers.find((l) => l.id === id)),
    };

    addBaseSourcesAndLayers(mockMap, 'mapbox://styles/mapbox/light-v11', {
      center: [-83.6968, 43.0234],
      radius: 100,
    } as any);

    // Verify sources
    expect(mockMap.addSource).toHaveBeenCalledWith('observations', expect.any(Object));

    // Verify highlight layer exists
    const highlightLayer = addedLayers.find((l) => l.id === 'observation-media-highlight');
    expect(highlightLayer).toBeDefined();
    expect(highlightLayer.type).toBe('circle');
    expect(highlightLayer.source).toBe('observations');
    expect(highlightLayer.filter).toEqual(['>', ['get', 'media_count'], 0]);
    expect(highlightLayer.paint).toEqual({
      'circle-radius': 7,
      'circle-color': 'transparent',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#F59E0B',
      'circle-opacity': 0.9,
    });
  });
});

// Mock React's useEffect to capture/run the callback
let effectCallback: any = null;
jest.mock('react', () => ({
  useEffect: (cb: any) => {
    effectCallback = cb;
  },
}));

import { useMediaLocationLayers } from '../../client/src/components/geospatial/hooks/useMediaLocationLayers';
import { networkApi } from '../../client/src/api/networkApi';

jest.mock('../../client/src/api/networkApi', () => ({
  networkApi: {
    getUnmatchedMediaGeoJson: jest.fn(),
  },
}));

describe('useMediaLocationLayers', () => {
  let mockMap: any;
  let mockMapboxgl: any;
  let mockPopup: any;
  let popupElement: any;
  let mediaClickHandler: ((event: any) => void) | null;
  let popupClickHandler: ((event: any) => void) | null;
  let mapRef: any;
  let mapboxRef: any;

  beforeEach(() => {
    jest.clearAllMocks();
    effectCallback = null;
    mediaClickHandler = null;
    popupClickHandler = null;

    (globalThis as any).window = { open: jest.fn() };

    popupElement = {
      addEventListener: jest.fn((event: string, handler: (event: any) => void) => {
        if (event === 'click') popupClickHandler = handler;
      }),
    };
    mockPopup = {
      setLngLat: jest.fn().mockReturnThis(),
      setHTML: jest.fn().mockReturnThis(),
      addTo: jest.fn().mockReturnThis(),
      getElement: jest.fn().mockReturnValue(popupElement),
    };

    mockMap = {
      addSource: jest.fn(),
      addLayer: jest.fn(),
      removeLayer: jest.fn(),
      removeSource: jest.fn(),
      getSource: jest.fn(),
      getLayer: jest.fn(),
      on: jest.fn((event: string, layer: string, handler: (event: any) => void) => {
        if (event === 'click' && layer === 'media-location-markers') {
          mediaClickHandler = handler;
        }
      }),
      off: jest.fn(),
    };

    mockMapboxgl = {
      Popup: jest.fn().mockImplementation(() => mockPopup),
    };

    mapRef = { current: mockMap };
    mapboxRef = { current: mockMapboxgl };
  });

  afterEach(() => {
    delete (globalThis as any).window;
  });

  it('does nothing when showMediaLocations is false and no layers exist', () => {
    mockMap.getSource.mockReturnValue(false);
    mockMap.getLayer.mockReturnValue(false);

    useMediaLocationLayers({
      mapReady: true,
      mapRef,
      mapboxRef,
      showMediaLocations: false,
    });

    if (effectCallback) {
      effectCallback();
    }

    expect(mockMap.removeSource).not.toHaveBeenCalled();
    expect(mockMap.removeLayer).not.toHaveBeenCalled();
  });

  it('removes existing sources/layers when showMediaLocations becomes false', () => {
    mockMap.getLayer.mockImplementation((id: string) => true);
    mockMap.getSource.mockImplementation((id: string) => true);

    useMediaLocationLayers({
      mapReady: true,
      mapRef,
      mapboxRef,
      showMediaLocations: false,
    });

    if (effectCallback) {
      effectCallback();
    }

    expect(mockMap.removeLayer).toHaveBeenCalledWith('media-location-icons');
    expect(mockMap.removeLayer).toHaveBeenCalledWith('media-location-markers');
    expect(mockMap.removeSource).toHaveBeenCalledWith('media-locations');
  });

  it('adds an empty GeoJSON source and layers when the endpoint has no features', async () => {
    const mockGeoJson = {
      type: 'FeatureCollection',
      features: [],
    };
    (networkApi.getUnmatchedMediaGeoJson as jest.Mock).mockResolvedValue(mockGeoJson);

    useMediaLocationLayers({
      mapReady: true,
      mapRef,
      mapboxRef,
      showMediaLocations: true,
    });

    expect(effectCallback).toBeDefined();

    // Run the effect callback
    const cleanup = effectCallback();

    // Allow promise microtasks to run
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(networkApi.getUnmatchedMediaGeoJson).toHaveBeenCalled();
    expect(mockMap.addSource).toHaveBeenCalledWith('media-locations', {
      type: 'geojson',
      data: mockGeoJson,
    });

    // Check layer additions
    expect(mockMap.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'media-location-markers', type: 'circle' })
    );
    expect(mockMap.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'media-location-icons', type: 'circle' })
    );

    expect(mockMap.on).toHaveBeenCalledWith(
      'click',
      'media-location-markers',
      expect.any(Function)
    );

    // Test cleanup return
    if (cleanup) {
      mockMap.getLayer.mockImplementation(() => true);
      mockMap.getSource.mockImplementation(() => true);
      cleanup();
      expect(mockMap.off).toHaveBeenCalledWith(
        'click',
        'media-location-markers',
        expect.any(Function)
      );
      expect(mockMap.removeLayer).toHaveBeenCalledWith('media-location-icons');
      expect(mockMap.removeLayer).toHaveBeenCalledWith('media-location-markers');
      expect(mockMap.removeSource).toHaveBeenCalledWith('media-locations');
    }
  });

  it('logs a rejected request without creating media sources or layers', async () => {
    const error = new Error('media unavailable');
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (networkApi.getUnmatchedMediaGeoJson as jest.Mock).mockRejectedValue(error);

    useMediaLocationLayers({
      mapReady: true,
      mapRef,
      mapboxRef,
      showMediaLocations: true,
    });

    const cleanup = effectCallback?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(consoleError).toHaveBeenCalledWith('Failed to load media locations', error);
    expect(mockMap.addSource).not.toHaveBeenCalled();
    expect(mockMap.addLayer).not.toHaveBeenCalled();

    cleanup?.();
  });

  it('renders popup metadata and opens the current admin inline URL from the thumbnail', async () => {
    (networkApi.getUnmatchedMediaGeoJson as jest.Mock).mockResolvedValue({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-83.69, 43.02] },
          properties: {
            id: '42',
            filename: 'field.jpg',
            captured_at: '2026-06-12T01:02:03Z',
            thumbnail_url: '/api/v2/networks/media/42/thumbnail',
          },
        },
      ],
    });

    useMediaLocationLayers({
      mapReady: true,
      mapRef,
      mapboxRef,
      showMediaLocations: true,
    });

    const cleanup = effectCallback?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mediaClickHandler).not.toBeNull();
    mediaClickHandler?.({
      features: [
        {
          properties: {
            id: '42',
            filename: 'field.jpg',
            captured_at: '2026-06-12T01:02:03Z',
            thumbnail_url: '/api/v2/networks/media/42/thumbnail',
          },
        },
      ],
      lngLat: { lng: -83.69, lat: 43.02 },
    });

    expect(mockPopup.setLngLat).toHaveBeenCalledWith({ lng: -83.69, lat: 43.02 });
    expect(mockPopup.setHTML).toHaveBeenCalledWith(expect.stringContaining('UNMATCHED MEDIA'));
    expect(mockPopup.setHTML).toHaveBeenCalledWith(expect.stringContaining('field.jpg'));
    expect(mockPopup.setHTML).toHaveBeenCalledWith(
      expect.stringContaining('/api/v2/networks/media/42/thumbnail')
    );

    const mediaTarget = {
      getAttribute: jest.fn().mockReturnValue('42'),
    };
    popupClickHandler?.({
      target: {
        closest: jest.fn().mockReturnValue(mediaTarget),
      },
    });

    expect((globalThis as any).window.open).toHaveBeenCalledWith(
      '/api/admin/network-media/42/inline',
      '_blank'
    );

    cleanup?.();
  });
});

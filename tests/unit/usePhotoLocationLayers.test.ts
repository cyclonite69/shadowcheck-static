// Mock React's useEffect to capture/run the callback
let effectCallback: any = null;
jest.mock('react', () => ({
  useEffect: (cb: any) => {
    effectCallback = cb;
  },
}));

import { usePhotoLocationLayers } from '../../client/src/components/geospatial/hooks/usePhotoLocationLayers';
import { networkApi } from '../../client/src/api/networkApi';

jest.mock('../../client/src/api/networkApi', () => ({
  networkApi: {
    getUnmatchedMediaGeoJson: jest.fn(),
  },
}));

describe('usePhotoLocationLayers', () => {
  let mockMap: any;
  let mockMapboxgl: any;
  let mapRef: any;
  let mapboxRef: any;

  beforeEach(() => {
    jest.clearAllMocks();
    effectCallback = null;

    mockMap = {
      addSource: jest.fn(),
      addLayer: jest.fn(),
      removeLayer: jest.fn(),
      removeSource: jest.fn(),
      getSource: jest.fn(),
      getLayer: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    mockMapboxgl = {
      Popup: jest.fn().mockImplementation(() => ({
        setLngLat: jest.fn().mockReturnThis(),
        setHTML: jest.fn().mockReturnThis(),
        addTo: jest.fn().mockReturnThis(),
        getElement: jest.fn().mockReturnValue({
          addEventListener: jest.fn(),
        }),
      })),
    };

    mapRef = { current: mockMap };
    mapboxRef = { current: mockMapboxgl };
  });

  it('does nothing when showPhotoLocations is false and no layers exist', () => {
    mockMap.getSource.mockReturnValue(false);
    mockMap.getLayer.mockReturnValue(false);

    usePhotoLocationLayers({
      mapReady: true,
      mapRef,
      mapboxRef,
      showPhotoLocations: false,
    });

    if (effectCallback) {
      effectCallback();
    }

    expect(mockMap.removeSource).not.toHaveBeenCalled();
    expect(mockMap.removeLayer).not.toHaveBeenCalled();
  });

  it('removes existing sources/layers when showPhotoLocations becomes false', () => {
    mockMap.getLayer.mockImplementation((id: string) => true);
    mockMap.getSource.mockImplementation((id: string) => true);

    usePhotoLocationLayers({
      mapReady: true,
      mapRef,
      mapboxRef,
      showPhotoLocations: false,
    });

    if (effectCallback) {
      effectCallback();
    }

    expect(mockMap.removeLayer).toHaveBeenCalledWith('photo-location-icons');
    expect(mockMap.removeLayer).toHaveBeenCalledWith('photo-location-markers');
    expect(mockMap.removeSource).toHaveBeenCalledWith('photo-locations');
  });

  it('fetches GeoJSON and registers layers on the map when showPhotoLocations is true', async () => {
    const mockGeoJson = {
      type: 'FeatureCollection',
      features: [],
    };
    (networkApi.getUnmatchedMediaGeoJson as jest.Mock).mockResolvedValue(mockGeoJson);

    usePhotoLocationLayers({
      mapReady: true,
      mapRef,
      mapboxRef,
      showPhotoLocations: true,
    });

    expect(effectCallback).toBeDefined();

    // Run the effect callback
    const cleanup = effectCallback();

    // Allow promise microtasks to run
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(networkApi.getUnmatchedMediaGeoJson).toHaveBeenCalled();
    expect(mockMap.addSource).toHaveBeenCalledWith('photo-locations', {
      type: 'geojson',
      data: mockGeoJson,
    });

    // Check layer additions
    expect(mockMap.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'photo-location-markers', type: 'circle' })
    );
    expect(mockMap.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'photo-location-icons', type: 'circle' })
    );

    expect(mockMap.on).toHaveBeenCalledWith(
      'click',
      'photo-location-markers',
      expect.any(Function)
    );

    // Test cleanup return
    if (cleanup) {
      mockMap.getLayer.mockImplementation(() => true);
      mockMap.getSource.mockImplementation(() => true);
      cleanup();
      expect(mockMap.off).toHaveBeenCalledWith(
        'click',
        'photo-location-markers',
        expect.any(Function)
      );
      expect(mockMap.removeLayer).toHaveBeenCalledWith('photo-location-icons');
      expect(mockMap.removeLayer).toHaveBeenCalledWith('photo-location-markers');
      expect(mockMap.removeSource).toHaveBeenCalledWith('photo-locations');
    }
  });
});

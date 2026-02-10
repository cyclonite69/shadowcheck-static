/**
 * WiGLE Map Preferences Hook
 * Manages map style, 3D buildings, and terrain preferences
 */

import { useState } from 'react';

export function useWigleMapPreferences() {
  const [mapStyle, setMapStyleState] = useState(() => {
    return localStorage.getItem('wigle_map_style') || 'mapbox://styles/mapbox/dark-v11';
  });

  const [show3dBuildings, setShow3dBuildingsState] = useState(() => {
    return localStorage.getItem('wigle_3d_buildings') === 'true';
  });

  const [showTerrain, setShowTerrainState] = useState(() => {
    return localStorage.getItem('wigle_terrain') === 'true';
  });

  const setMapStyle = (style: string) => {
    localStorage.setItem('wigle_map_style', style);
    setMapStyleState(style);
  };

  const setShow3dBuildings = (enabled: boolean) => {
    localStorage.setItem('wigle_3d_buildings', String(enabled));
    setShow3dBuildingsState(enabled);
  };

  const setShowTerrain = (enabled: boolean) => {
    localStorage.setItem('wigle_terrain', String(enabled));
    setShowTerrainState(enabled);
  };

  return {
    mapStyle,
    setMapStyle,
    show3dBuildings,
    setShow3dBuildings,
    showTerrain,
    setShowTerrain,
  };
}

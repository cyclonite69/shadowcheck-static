import { useEffect } from 'react';

type ApplyMapLayerDefaultsProps = {
  mapReady: boolean;
  show3DBuildings: boolean;
  showTerrain: boolean;
  add3DBuildings: () => void;
  addTerrain: () => void;
};

export const useApplyMapLayerDefaults = ({
  mapReady,
  show3DBuildings,
  showTerrain,
  add3DBuildings,
  addTerrain,
}: ApplyMapLayerDefaultsProps) => {
  useEffect(() => {
    if (!mapReady) return;

    // Apply 3D buildings if persisted as enabled
    if (show3DBuildings) {
      add3DBuildings();
    }

    // Apply terrain if persisted as enabled
    if (showTerrain) {
      addTerrain();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);
};

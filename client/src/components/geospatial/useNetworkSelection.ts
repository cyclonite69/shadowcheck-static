import { useMemo, useState } from 'react';
import type { NetworkRow } from '../../types/network';

type NetworkSelectionProps = {
  networks: NetworkRow[];
};

export const useNetworkSelection = ({ networks }: NetworkSelectionProps) => {
  const [selectedNetworks, setSelectedNetworks] = useState<Set<string>>(new Set());

  const toggleSelectNetwork = (bssid: string) => {
    setSelectedNetworks((prev) => {
      const ns = new Set(prev);
      ns.has(bssid) ? ns.delete(bssid) : ns.add(bssid);
      return ns;
    });
  };

  const selectNetworkExclusive = (bssid: string) => {
    setSelectedNetworks(new Set([bssid]));
  };

  const toggleSelectAll = () => {
    if (selectedNetworks.size === networks.length) {
      // All selected, deselect all
      setSelectedNetworks(new Set());
    } else {
      // Some or none selected, select all visible
      setSelectedNetworks(new Set(networks.map((n) => n.bssid)));
    }
  };

  const allSelected = useMemo(
    () => networks.length > 0 && selectedNetworks.size === networks.length,
    [networks.length, selectedNetworks]
  );
  const someSelected = useMemo(
    () => selectedNetworks.size > 0 && selectedNetworks.size < networks.length,
    [networks.length, selectedNetworks]
  );

  return {
    selectedNetworks,
    toggleSelectNetwork,
    selectNetworkExclusive,
    toggleSelectAll,
    allSelected,
    someSelected,
    setSelectedNetworks,
  };
};

import { useNetworkContextMenu } from './useNetworkContextMenu';
import { useNetworkNotes } from './useNetworkNotes';
import { useTimeFrequencyModal } from './useTimeFrequencyModal';

export interface UseGeospatialOverlayOrchestrationOptions {
  logError: (msg: string, err?: any) => void;
  resetPagination: () => void;
}

export function useGeospatialOverlayOrchestration({
  logError,
  resetPagination,
}: UseGeospatialOverlayOrchestrationOptions) {
  const contextMenuState = useNetworkContextMenu({
    logError,
    onTagUpdated: resetPagination,
  });

  const notesState = useNetworkNotes({ logError });

  const timeFreqState = useTimeFrequencyModal();

  return {
    ...contextMenuState,
    ...notesState,
    ...timeFreqState,
  };
}

import { useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { NetworkRow, NetworkTag } from '../../types/network';

type ContextMenuState = {
  visible: boolean;
  x: number;
  y: number;
  network: NetworkRow | null;
  tag: NetworkTag | null;
  position: 'below' | 'above';
};

type WigleLookupDialogState = {
  visible: boolean;
  network: NetworkRow | null;
  loading: boolean;
  result: { success: boolean; message: string; observationsImported?: number } | null;
};

type NetworkContextMenuProps = {
  logError: (message: string, error?: unknown) => void;
};

export const useNetworkContextMenu = ({ logError }: NetworkContextMenuProps) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    network: null,
    tag: null,
    position: 'below',
  });
  const [tagLoading, setTagLoading] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // WiGLE lookup dialog state
  const [wigleLookupDialog, setWigleLookupDialog] = useState<WigleLookupDialogState>({
    visible: false,
    network: null,
    loading: false,
    result: null,
  });

  const openContextMenu = async (e: ReactMouseEvent, network: NetworkRow) => {
    e.preventDefault();
    e.stopPropagation();

    const menuHeight = 320; // Height of context menu in pixels
    const menuWidth = 200; // Width of context menu in pixels
    const padding = 10; // Padding from screen edge

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    let posX = e.clientX;
    let posY = e.clientY;
    let position: 'below' | 'above' = 'below';

    // ========== VERTICAL POSITIONING ==========
    // Check if menu would go off bottom of screen
    if (posY + menuHeight + padding > viewportHeight) {
      // Flip menu upward
      posY = e.clientY - menuHeight;
      position = 'above';
    }

    // Ensure menu doesn't go above top of screen
    if (posY < padding) {
      posY = padding;
      position = 'below'; // Reset to below if we hit top
    }

    // ========== HORIZONTAL POSITIONING ==========
    // Check if menu would go off right side of screen
    if (posX + menuWidth + padding > viewportWidth) {
      posX = viewportWidth - menuWidth - padding;
    }

    // Check if menu would go off left side of screen
    if (posX - padding < 0) {
      posX = padding;
    }

    // Fetch current tag state for this network
    try {
      const response = await fetch(`/api/network-tags/${encodeURIComponent(network.bssid)}`);
      const tag = await response.json();
      setContextMenu({
        visible: true,
        x: posX,
        y: posY,
        network,
        tag,
        position,
      });
    } catch (err) {
      logError('Failed to fetch network tag', err);
      setContextMenu({
        visible: true,
        x: posX,
        y: posY,
        network,
        tag: {
          bssid: network.bssid,
          is_ignored: false,
          ignore_reason: null,
          threat_tag: null,
          notes: null,
          exists: false,
        },
        position,
      });
    }
  };

  const closeContextMenu = () => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleTagAction = async (
    action: 'ignore' | 'threat' | 'suspect' | 'false_positive' | 'investigate' | 'clear',
    notes?: string
  ) => {
    if (!contextMenu.network) return;
    setTagLoading(true);
    try {
      const bssid = encodeURIComponent(contextMenu.network.bssid);
      let response;

      switch (action) {
        case 'ignore':
          response = await fetch(`/api/network-tags/${bssid}/ignore`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ignore_reason: 'known_friend' }),
          });
          break;
        case 'threat':
          response = await fetch(`/api/network-tags/${bssid}/threat`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ threat_tag: 'THREAT', threat_confidence: 1.0 }),
          });
          break;
        case 'suspect':
          response = await fetch(`/api/network-tags/${bssid}/threat`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ threat_tag: 'SUSPECT', threat_confidence: 0.7 }),
          });
          break;
        case 'false_positive':
          response = await fetch(`/api/network-tags/${bssid}/threat`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ threat_tag: 'FALSE_POSITIVE', threat_confidence: 1.0 }),
          });
          break;
        case 'investigate':
          // Show WiGLE lookup dialog instead of immediately tagging
          setWigleLookupDialog({
            visible: true,
            network: contextMenu.network,
            loading: false,
            result: null,
          });
          setTagLoading(false);
          closeContextMenu();
          return; // Exit early - dialog will handle the rest
        case 'clear':
          response = await fetch(`/api/network-tags/${bssid}`, { method: 'DELETE' });
          break;
      }

      if (response?.ok) {
        const result = await response.json();
        setContextMenu((prev) => ({ ...prev, tag: result.tag || { ...prev.tag, exists: false } }));
      }
    } catch (err) {
      logError('Failed to update network tag', err);
    } finally {
      setTagLoading(false);
      closeContextMenu();
    }
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu.visible]);

  // WiGLE lookup dialog handlers
  const closeWigleLookupDialog = () => {
    setWigleLookupDialog((prev) => ({ ...prev, visible: false, result: null }));
  };

  const handleWigleLookup = async (withLookup: boolean) => {
    if (!wigleLookupDialog.network) return;

    const bssid = wigleLookupDialog.network.bssid;
    setWigleLookupDialog((prev) => ({ ...prev, loading: true }));

    try {
      // Always tag as INVESTIGATE first
      await fetch(`/api/network-tags/${encodeURIComponent(bssid)}/investigate`, {
        method: 'PATCH',
      });

      if (withLookup) {
        // Call WiGLE v3 detail endpoint with import flag
        const response = await fetch(`/api/wigle/detail/${encodeURIComponent(bssid)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ import: true }),
        });
        const result = await response.json();

        if (response.ok && result.ok) {
          const obsCount = result.importedObservations || result.data?.observations?.length || 0;
          setWigleLookupDialog((prev) => ({
            ...prev,
            loading: false,
            result: {
              success: true,
              message:
                obsCount > 0
                  ? `Imported ${obsCount} observations from WiGLE`
                  : 'Network found but no new observations to import',
              observationsImported: obsCount,
            },
          }));
        } else {
          // Handle both simple {error: "string"} and structured {error: {message, code, statusCode}} formats
          const errorMessage =
            typeof result.error === 'string'
              ? result.error
              : result.error?.message ||
                'WiGLE lookup failed - network may not exist in WiGLE database';
          setWigleLookupDialog((prev) => ({
            ...prev,
            loading: false,
            result: {
              success: false,
              message: errorMessage,
            },
          }));
        }
      } else {
        // Just tagged, close dialog
        setWigleLookupDialog((prev) => ({
          ...prev,
          loading: false,
          result: { success: true, message: 'Tagged as INVESTIGATE' },
        }));
        setTimeout(closeWigleLookupDialog, 1500);
      }
    } catch (err) {
      logError('WiGLE lookup failed', err);
      setWigleLookupDialog((prev) => ({
        ...prev,
        loading: false,
        result: { success: false, message: 'Network error during lookup' },
      }));
    }
  };

  return {
    contextMenu,
    tagLoading,
    contextMenuRef,
    openContextMenu,
    closeContextMenu,
    handleTagAction,
    // WiGLE lookup dialog
    wigleLookupDialog,
    closeWigleLookupDialog,
    handleWigleLookup,
  };
};

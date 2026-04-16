/**
 * Global popup state manager
 * Ensures only one tooltip popup is visible at a time across all layers
 */

let activePopup: any = null;

export const popupStateManager = {
  /**
   * Set the active popup and close any previous one
   */
  setActive(popup: any) {
    if (activePopup && activePopup !== popup) {
      try {
        activePopup.remove();
      } catch {
        // Popup may already be removed
      }
    }
    activePopup = popup;
  },

  /**
   * Get the currently active popup
   */
  getActive(): any {
    return activePopup;
  },

  /**
   * Clear the active popup reference
   */
  clear() {
    activePopup = null;
  },

  /**
   * Close the active popup if it matches the given popup
   */
  closeIfActive(popup: any) {
    if (activePopup === popup) {
      activePopup = null;
    }
  },
};

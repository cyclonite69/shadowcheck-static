/**
 * Transient pin-drop mode store.
 * Not persisted — resets on page reload.
 */
import { create } from 'zustand';

interface PinDropStore {
  active: boolean;
  start: () => void;
  cancel: () => void;
}

export const usePinDropStore = create<PinDropStore>((set) => ({
  active: false,
  start: () => set({ active: true }),
  cancel: () => set({ active: false }),
}));

import { create } from 'zustand';
import { normalizeButtons, type DialogButton } from '../utils/dialog';

export interface DialogRequest {
  id: number;
  title: string;
  message?: string;
  buttons: DialogButton[];
}

interface DialogStore {
  /** The dialog on screen, if any */
  current: DialogRequest | null;
  /** Dialogs waiting their turn: one is shown at a time */
  queue: DialogRequest[];
  show: (title: string, message?: string, buttons?: DialogButton[]) => void;
  /** Close the dialog on screen and bring up the next one */
  close: () => void;
}

let nextId = 1;

export const useDialogStore = create<DialogStore>((set, get) => ({
  current: null,
  queue: [],

  show: (title, message, buttons) => {
    const request: DialogRequest = { id: nextId++, title, message, buttons: normalizeButtons(buttons) };
    if (get().current) {
      set((s) => ({ queue: [...s.queue, request] }));
    } else {
      set({ current: request });
    }
  },

  close: () => {
    const [next, ...rest] = get().queue;
    set({ current: next ?? null, queue: rest });
  },
}));

/**
 * Drop-in replacement for Alert.alert(title, message, buttons) that shows the app's own dialog.
 * Works from anywhere, including plain functions outside React.
 */
export function showAlert(title: string, message?: string, buttons?: DialogButton[]): void {
  useDialogStore.getState().show(title, message, buttons);
}

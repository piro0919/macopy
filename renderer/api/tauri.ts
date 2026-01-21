import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { HistoryItem } from "../../shared/types";

interface MacopyAPI {
  onHistory: (callback: (data: HistoryItem[]) => void) => void;
  hideWindow: () => Promise<void>;
  pasteFromClipboard: () => Promise<void>;
  updateWindowHeight: (height: number) => void;
  copyImage: (dataUrl: string) => void;
  toggleTrayIcon: () => void;
  getTrayIconState: () => Promise<boolean>;
  quitApp: () => void;
}

export const tauriApi: MacopyAPI = {
  onHistory: (callback: (data: HistoryItem[]) => void) => {
    listen<HistoryItem[]>("clipboard-history", (event) => {
      callback(event.payload);
    });
  },

  hideWindow: async () => {
    await invoke("hide_window");
  },

  pasteFromClipboard: async () => {
    await invoke("paste_from_clipboard");
  },

  updateWindowHeight: (height: number) => {
    invoke("update_window_height", { height });
  },

  copyImage: (dataUrl: string) => {
    invoke("copy_image", { dataUrl });
  },

  toggleTrayIcon: () => {
    invoke("toggle_tray_icon");
  },

  getTrayIconState: async (): Promise<boolean> => {
    return invoke<boolean>("get_tray_icon_state");
  },

  quitApp: () => {
    invoke("quit_app");
  },
};

export const copyText = async (text: string): Promise<void> => {
  await invoke("copy_text", { text });
};

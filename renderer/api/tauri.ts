import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { HistoryItem } from "../../shared/types";

type MacopyAPI = {
  copyImage: (dataUrl: string) => void;
  getTrayIconState: () => Promise<boolean>;
  hideWindow: () => Promise<void>;
  onHistory: (callback: (data: HistoryItem[]) => void) => void;
  pasteFromClipboard: () => Promise<void>;
  quitApp: () => void;
  toggleTrayIcon: () => void;
  updateWindowHeight: (height: number) => void;
};

export const tauriApi: MacopyAPI = {
  copyImage: (dataUrl: string) => {
    invoke("copy_image", { dataUrl });
  },
  getTrayIconState: async (): Promise<boolean> => {
    return invoke<boolean>("get_tray_icon_state");
  },
  hideWindow: async () => {
    await invoke("hide_window");
  },
  onHistory: (callback: (data: HistoryItem[]) => void) => {
    listen<HistoryItem[]>("clipboard-history", (event) => {
      callback(event.payload);
    });
  },
  pasteFromClipboard: async () => {
    await invoke("paste_from_clipboard");
  },
  quitApp: () => {
    invoke("quit_app");
  },
  toggleTrayIcon: () => {
    invoke("toggle_tray_icon");
  },
  updateWindowHeight: (height: number) => {
    invoke("update_window_height", { height });
  },
};

export const copyText = async (text: string): Promise<void> => {
  await invoke("copy_text", { text });
};

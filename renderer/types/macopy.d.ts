import type { HistoryItem } from "../../shared/types";

export interface MacopyAPI {
  onHistory: (callback: (data: HistoryItem[]) => void) => void;
  hideWindow: () => void;
  pasteFromClipboard: () => void;
  updateWindowHeight: (height: number) => void;
  copyImage: (dataUrl: string) => void;
  toggleTrayIcon: () => void;
  getTrayIconState: () => Promise<boolean>;
}

declare global {
  interface Window {
    macopy: MacopyAPI;
  }
}

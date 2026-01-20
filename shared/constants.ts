// Window dimensions
export const POPUP_WIDTH = 250;
export const POPUP_HEIGHT = 0;

// Clipboard settings
export const MAX_HISTORY_ITEMS = 10;
export const CLIPBOARD_WATCH_INTERVAL_MS = 200_000; // 0.2 seconds in microseconds (for Swift)

// Tray icon dimensions
export const TRAY_ICON_SIZE = 18;

// Timing
export const PASTE_DELAY_SECONDS = 0.05;

// Dev server
export const DEV_SERVER_URL = "http://localhost:5173";

// Shortcut options
export const SHORTCUT_OPTIONS = [
  { label: "⌥ Option + V", value: "Alt+V" },
  { label: "⌘ Shift + V", value: "CommandOrControl+Shift+V" },
  { label: "⌃ Ctrl + Option + V", value: "Control+Alt+V" },
] as const;

export const DEFAULT_SHORTCUT = "Alt+V";

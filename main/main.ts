import {
  app,
  BrowserWindow,
  clipboard,
  globalShortcut,
  Menu,
  MenuItemConstructorOptions,
  nativeImage,
  Tray,
  screen,
  ipcMain,
} from "electron";
import * as path from "path";
import { uIOhook } from "uiohook-napi";
import * as fs from "fs";
import { spawn } from "child_process";
import * as readline from "readline";

const applescript = require("applescript");
const Store = require("@streamhue/electron-store");
const store = new Store();
const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

type HistoryItem =
  | { type: "text"; content: string }
  | { type: "image"; content: string };
const history: HistoryItem[] = [];
let tray: null | Tray = null;
let win: BrowserWindow | null = null;
let lastActiveApp = "";
let showTrayIcon = store.get("showTrayIcon", true);

const WIDTH = 250;
const HEIGHT = 0;

const shortcutOptions = [
  { label: "⌥ Option + V", value: "Alt+V" },
  { label: "⌘ Shift + V", value: "CommandOrControl+Shift+V" },
  { label: "⌃ Ctrl + Option + V", value: "Control+Alt+V" },
];

let currentShortcut = store.get("shortcut", "Alt+V");
let openAtLogin = app.getLoginItemSettings().openAtLogin;

function checkIsJapanese(): boolean {
  return app.getLocale().startsWith("ja");
}

function registerShortcut(shortcut: string) {
  globalShortcut.register(shortcut, () => {
    applescript.execString(
      'tell application "System Events" to get name of first application process whose frontmost is true',
      (err: any, result: any) => {
        if (!err && typeof result === "string") {
          lastActiveApp = result;
        }
      }
    );

    const isJapanese = checkIsJapanese();

    updateClipboard(isJapanese);
    win?.webContents.send("clipboard-history", history);

    const cursor = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursor);
    const bounds = display.workArea;

    const winBounds = win?.getBounds();
    const winWidth = WIDTH;
    const winHeight = winBounds?.height ?? 200;

    let x = cursor.x;
    let y = cursor.y;

    if (
      x + winWidth > bounds.x + bounds.width ||
      y + winHeight > bounds.y + bounds.height
    ) {
      x = x - winWidth;
      y = y - winHeight;
    }

    win?.setBounds({ x, y, width: winWidth, height: winHeight });
    win?.isVisible() ? win.hide() : win?.show();
  });
}

function createPopupWindow() {
  win = new BrowserWindow({
    alwaysOnTop: true,
    frame: false,
    height: HEIGHT,
    resizable: false,
    show: false,
    skipTaskbar: true,
    transparent: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    width: WIDTH,
    roundedCorners: false,
  });

  const isDev = !app.isPackaged;
  const url = isDev
    ? "http://localhost:5173"
    : `file://${encodeURI(path.resolve(__dirname, "../dist/index.html"))}`;

  win.loadURL(url);
  win.on("blur", () => win?.hide());
}

// 新しい関数: コンテキストメニューの生成を別関数に抽出
function buildTrayContextMenu(isJapanese: boolean): Menu {
  const pasteScript = (app: string) => `
    tell application "${app}"
      activate
    end tell
    delay 0.05
    tell application "System Events"
      keystroke "v" using {command down}
    end tell
  `;

  const historyMenuItems: MenuItemConstructorOptions[] = history
    .slice(0, 10)
    .map((item, i) => ({
      label: item.type === "text" ? item.content.slice(0, 30) : "[Image]",
      accelerator: `${i < 9 ? i + 1 : 0}`,
      click: () => {
        applescript.execString(
          'tell application "System Events" to get name of first application process whose frontmost is true',
          (err: any, result: any) => {
            if (!err && typeof result === "string") {
              lastActiveApp = result;
            }

            if (item.type === "text") {
              clipboard.writeText(item.content);
            } else {
              const img = nativeImage.createFromDataURL(item.content);
              clipboard.writeImage(img);
            }

            applescript.execString(pasteScript(lastActiveApp));
          }
        );
      },
    }));

  const settingsMenuItems: MenuItemConstructorOptions[] = [
    { type: "separator" as const },
    {
      label: isJapanese ? "ショートカット設定" : "Shortcut Settings",
      submenu: shortcutOptions.map((opt) => ({
        label: opt.label,
        type: "radio" as const,
        checked: currentShortcut === opt.value,
        click: () => {
          globalShortcut.unregisterAll();
          currentShortcut = opt.value;
          store.set("shortcut", currentShortcut);
          registerShortcut(currentShortcut);
        },
      })),
    },
    {
      label: isJapanese ? "ログイン時に自動起動" : "Launch at Login",
      type: "checkbox" as const,
      checked: openAtLogin,
      click: (menuItem) => {
        openAtLogin = menuItem.checked;
        app.setLoginItemSettings({ openAtLogin });
        if (!app.isPackaged) {
          console.log("自動起動設定:", openAtLogin);
        }
      },
    },
    {
      label: isJapanese ? "Macopy を終了" : "Quit Macopy",
      role: "quit" as const,
    },
  ];

  return Menu.buildFromTemplate([...historyMenuItems, ...settingsMenuItems]);
}

function createTray() {
  const isJapanese = checkIsJapanese();
  const iconPath = path.join(__dirname, "trayTemplate.png");
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon.resize({ width: 18, height: 18 }));
  tray.setToolTip("Macopy");
  tray.setContextMenu(buildTrayContextMenu(isJapanese));
}

function updateClipboard(isJapanese: boolean) {
  const text = clipboard.readText();
  const image = clipboard.readImage();

  if (image && !image.isEmpty()) {
    const dataUrl = image.toDataURL();
    if (history[0]?.type !== "image" || history[0]?.content !== dataUrl) {
      history.unshift({ type: "image", content: dataUrl });
    }
  } else if (
    text &&
    (history[0]?.type !== "text" || history[0]?.content !== text)
  ) {
    history.unshift({ type: "text", content: text });
  }

  if (history.length > 10) history.pop();

  // トレイメニューを更新
  if (tray) {
    tray.setContextMenu(buildTrayContextMenu(isJapanese));
  }
}

function startClipboardWatcher() {
  const watcherPath = path.join(__dirname, "clipboard-watcher");

  if (!fs.existsSync(watcherPath)) {
    console.warn("clipboard-watcher not found. Skipping clipboard monitor.");
    return;
  }

  const proc = spawn(watcherPath);
  const rl = readline.createInterface({ input: proc.stdout });

  rl.on("line", (line) => {
    if (line.trim() === "clipboard-changed") {
      updateClipboard(checkIsJapanese());
      win?.webContents.send("clipboard-history", history);
    }
  });

  proc.stderr.on("data", (data) => {
    console.error(`Watcher error: ${data}`);
  });

  proc.on("exit", (code) => {
    console.warn(`clipboard-watcher exited with code ${code}`);
  });
}

function setupGlobalClickListener() {
  uIOhook.on("mousedown", () => {
    if (!win) return;

    const cursor = screen.getCursorScreenPoint();
    const bounds = win.getBounds();

    const isInside =
      cursor.x >= bounds.x &&
      cursor.x <= bounds.x + bounds.width &&
      cursor.y >= bounds.y &&
      cursor.y <= bounds.y + bounds.height;

    if (!isInside) {
      win.hide();
    }
  });

  uIOhook.start();
}

ipcMain.on("hide-window", () => {
  win?.hide();
});

ipcMain.on("paste-from-clipboard", () => {
  const script = `
      tell application "${lastActiveApp}"
        activate
      end tell
      delay 0.05
      tell application "System Events"
        keystroke "v" using {command down}
      end tell
    `;

  applescript.execString(script);
});

ipcMain.on("update-window-height", (_, height: number) => {
  if (win && height > 0) {
    win.setBounds({
      ...win.getBounds(),
      height,
    });
  }
});

ipcMain.on("copy-image", (_, dataUrl: string) => {
  const img = nativeImage.createFromDataURL(dataUrl);
  clipboard.writeImage(img);
});

ipcMain.on("toggle-tray-icon", () => {
  if (showTrayIcon) {
    tray?.destroy();
    tray = null;
  } else {
    createTray();
  }
  showTrayIcon = !showTrayIcon;
  store.set("showTrayIcon", showTrayIcon);
});

ipcMain.handle("get-tray-icon-state", () => {
  return showTrayIcon;
});

if (process.platform === "darwin") {
  const loginItemSettings = app.getLoginItemSettings();
  const launchedAsHidden =
    loginItemSettings.wasOpenedAsHidden || loginItemSettings.wasOpenedAtLogin;

  if (launchedAsHidden) {
    app.dock?.hide();
  }
}

app.whenReady().then(() => {
  if (process.platform === "darwin") {
    app.dock?.hide();
  }

  createPopupWindow();

  if (showTrayIcon) {
    createTray();
  }

  registerShortcut(currentShortcut);
  startClipboardWatcher();
  setupGlobalClickListener();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  // uIOhookのイベントリスナーを適切に解除
  uIOhook.stop();
});

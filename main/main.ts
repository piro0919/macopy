import {
  app,
  BrowserWindow,
  clipboard,
  globalShortcut,
  Menu,
  nativeImage,
  Tray,
  screen,
  ipcMain,
} from "electron";
import * as path from "path";
const Store = require("@streamhue/electron-store");

const store = new Store();
const applescript = require("applescript");

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

    updateClipboard();
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

function createTray() {
  const iconPath = path.join(__dirname, "trayTemplate.png");
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon.resize({ width: 18, height: 18 }));
  tray.setToolTip("Macopy");

  tray.setContextMenu(
    Menu.buildFromTemplate([
      ...history.slice(0, 10).map((item, i) => ({
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
            }
          );
        },
      })),
      { type: "separator" },
      {
        label: "ショートカット設定",
        submenu: shortcutOptions.map((opt) => ({
          label: opt.label,
          type: "radio",
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
        label: "ログイン時に自動起動",
        type: "checkbox",
        checked: openAtLogin,
        click: (menuItem) => {
          openAtLogin = menuItem.checked;
          app.setLoginItemSettings({ openAtLogin });
          if (!app.isPackaged) {
            console.log("自動起動設定:", openAtLogin);
          }
        },
      },
      { label: "Macopy を終了", role: "quit" },
    ])
  );
}

function updateClipboard() {
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

  if (tray) {
    tray.setContextMenu(
      Menu.buildFromTemplate([
        ...history.slice(0, 10).map((item, i) => ({
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
              }
            );
          },
        })),
        { type: "separator" },
        {
          label: "ショートカット設定",
          submenu: shortcutOptions.map((opt) => ({
            label: opt.label,
            type: "radio",
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
          label: "ログイン時に自動起動",
          type: "checkbox",
          checked: openAtLogin,
          click: (menuItem) => {
            openAtLogin = menuItem.checked;
            app.setLoginItemSettings({ openAtLogin });
            if (!app.isPackaged) {
              console.log("自動起動設定:", openAtLogin);
            }
          },
        },
        { label: "Macopy を終了", role: "quit" },
      ])
    );
  }
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

app.whenReady().then(() => {
  if (process.platform === "darwin") {
    app.dock?.hide();
  }

  createPopupWindow();

  if (showTrayIcon) {
    createTray();
  }

  registerShortcut(currentShortcut);

  setInterval(updateClipboard, 1000); // 定期ポーリング
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

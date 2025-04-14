const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("macopy", {
  onHistory: (callback) =>
    ipcRenderer.on("clipboard-history", (_, data) => callback(data)),
  hideWindow: () => ipcRenderer.send("hide-window"),
  pasteFromClipboard: () => ipcRenderer.send("paste-from-clipboard"),
  updateWindowHeight: (h) => ipcRenderer.send("update-window-height", h),
  copyImage: (dataUrl) => ipcRenderer.send("copy-image", dataUrl),
  toggleTrayIcon: () => ipcRenderer.send("toggle-tray-icon"),
  getTrayIconState: () => ipcRenderer.invoke("get-tray-icon-state"),
});

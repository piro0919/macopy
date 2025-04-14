# <img src="./assets/trayTemplate.png" alt="App icon" width="32" style="vertical-align: middle; margin-right: 8px;" /> Macopy

> A minimal clipboard history tool for macOS with global shortcut support, tray control, and paste automation.

---

**Macopy** is a simple and efficient clipboard manager tailored for macOS. Designed with focus on minimal UI and fast keyboard operation, Macopy helps you:

- 📋 Track recent clipboard items (text and image)
- ⚡️ Quickly paste from history using a global shortcut
- 🧠 Automatically detect the frontmost app and simulate paste
- 🧭 Tray icon for history access and setting control
- 💾 Remembers window size between launches

---

## 🚀 Features

| Feature                | Description                                        |
| ---------------------- | -------------------------------------------------- |
| 📋 Clipboard History   | Tracks latest 10 items (text or image)             |
| 🖼 Image Paste Support | Copy and reuse image items easily                  |
| 🧠 App Detection       | AppleScript-based active app tracking              |
| ⚡️ Global Shortcut    | Quickly toggle the popup with a hotkey             |
| 🧲 Paste Automation    | Automatically simulates ⌘+V into the frontmost app |
| 🧃 Tray Menu           | Access recent items, settings, and quit from tray  |
| 🛠 Persistent Settings | Shortcut, tray visibility saved locally            |

---

## 🛠 Installation

[⬇ Download the latest release](https://github.com/piro0919/macopy/releases/latest)

Or build locally:

```bash
git clone https://github.com/piro0919/macopy
cd macopy
npm install
npm run build
npm run start
```

> On first run, macOS will ask for **Accessibility** and optionally **Screen Recording** permissions. These are required for paste automation and app detection.

---

## 🔐 Permissions Required (macOS)

To enable full functionality, please grant the following:

- **System Settings > Privacy & Security > Accessibility**  
  Allow Macopy to control your system for paste automation.

- **System Settings > Privacy & Security > Screen Recording** _(optional)_  
  Required on some macOS versions for detecting frontmost app.

---

## 📝 License

MIT — Contributions welcome!

---

## 🙌 Credits

Built with ❤️ using [Electron](https://www.electronjs.org/), [TypeScript](https://www.typescriptlang.org/), and AppleScript integration.

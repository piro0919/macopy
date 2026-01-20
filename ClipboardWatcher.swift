import AppKit
import Foundation

var lastChangeCount = NSPasteboard.general.changeCount

func checkClipboard() {
  let current = NSPasteboard.general.changeCount
  if current != lastChangeCount {
    lastChangeCount = current
    print("clipboard-changed")
    fflush(stdout)
  }
}

// Command+C/X 検出時に即座にチェック
NSEvent.addGlobalMonitorForEvents(matching: .keyDown) { event in
  if event.modifierFlags.contains(.command) {
    if let key = event.charactersIgnoringModifiers {
      if key == "c" || key == "x" {
        // 少し遅延させてクリップボードの更新を待つ
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
          checkClipboard()
        }
      }
    }
  }
}

// 右クリックコピー等のフォールバック（1秒間隔）
Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
  checkClipboard()
}

RunLoop.main.run()

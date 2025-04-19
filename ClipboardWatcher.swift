import AppKit
import Foundation

var lastChangeCount = NSPasteboard.general.changeCount

while true {
  let currentChangeCount = NSPasteboard.general.changeCount
  if currentChangeCount != lastChangeCount {
    lastChangeCount = currentChangeCount
    print("clipboard-changed")  // Electron 側に通知
    fflush(stdout)
  }
  usleep(200_000)  // 0.2秒ごとに監視
}

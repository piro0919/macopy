import { useEffect, useState } from "react";
import useMeasure from "react-use-measure";
import type { HistoryItem } from "../shared/types";
import styles from "./App.module.css";
import "./types/macopy.d.ts";

const App = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [trayVisible, setTrayVisible] = useState<boolean>(true);
  const [ref, bounds] = useMeasure();
  const isJapanese = navigator.language.startsWith("ja");

  useEffect(() => {
    window.macopy.onHistory((data: HistoryItem[]) => {
      setHistory(data);
    });
  }, []);

  useEffect(() => {
    (async () => {
      const result = await window.macopy.getTrayIconState();
      setTrayVisible(result);
    })();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key === "ArrowUp") {
        setSelectedIndex((prev) =>
          prev === 0 ? history.length - 1 : prev - 1
        );
      } else if (e.key === "ArrowDown") {
        setSelectedIndex((prev) =>
          prev === history.length - 1 ? 0 : prev + 1
        );
      } else if (e.key === "Enter") {
        const item = history[selectedIndex];
        if (item.type === "text") {
          navigator.clipboard.writeText(item.content).then(() => {
            window.macopy.hideWindow();
            window.macopy.pasteFromClipboard();
          });
        } else {
          window.macopy.copyImage(item.content);
          window.macopy.hideWindow();
          window.macopy.pasteFromClipboard();
        }
      } else if (/^[0-9]$/.test(e.key)) {
        const pressed = Number(e.key);
        const index = pressed === 0 ? 9 : pressed - 1;
        if (index < history.length) {
          const item = history[index];
          if (item.type === "text") {
            navigator.clipboard.writeText(item.content).then(() => {
              window.macopy.hideWindow();
              window.macopy.pasteFromClipboard();
            });
          } else {
            window.macopy.copyImage(item.content);
            window.macopy.hideWindow();
            window.macopy.pasteFromClipboard();
          }
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [history, selectedIndex]);

  useEffect(() => {
    window.macopy.updateWindowHeight(bounds.height);
  }, [bounds.height]);

  return (
    <main className={styles.root} ref={ref}>
      {history.map((item, index) => (
        <button
          className={`${styles.item} ${
            index === selectedIndex && selectedIndex !== -1
              ? styles.selected
              : ""
          }`}
          key={`${item.type}-${item.content.slice(0, 20)}-${index}`}
          onClick={async () => {
            if (item.type === "text") {
              await navigator.clipboard.writeText(item.content);
            } else {
              window.macopy.copyImage(item.content);
            }
            window.macopy.hideWindow();
            window.macopy.pasteFromClipboard();
          }}
          onMouseEnter={() => {
            setSelectedIndex(index);
          }}
          type="button"
        >
          <div>
            {item.type === "text" ? (
              <div className={styles.text}>{item.content.slice(0, 100)}</div>
            ) : (
              <div className={styles.imageContainer}>
                <img
                  alt="Clipboard content"
                  className={styles.image}
                  src={item.content}
                />
              </div>
            )}
          </div>
          <div className={styles.num}>{index < 9 ? index + 1 : 0}</div>
        </button>
      ))}
      {history.length > 0 ? <hr className={styles.hr} /> : null}
      <button
        className={`${styles.item} ${styles.toggle}`}
        onClick={() => {
          window.macopy.toggleTrayIcon();
          setTrayVisible((prev) => !prev);
        }}
        onMouseEnter={() => {
          setSelectedIndex(-1);
        }}
        type="button"
      >
        {isJapanese
          ? trayVisible
            ? "メニューバーから非表示"
            : "メニューバーに表示"
          : trayVisible
            ? "Hide from menu bar"
            : "Show in menu bar"}
      </button>
      <button
        className={`${styles.item} ${styles.close}`}
        onClick={() => {
          window.close();
        }}
        onMouseEnter={() => {
          setSelectedIndex(-1);
        }}
        type="button"
      >
        {isJapanese ? "Macopy を終了" : "Quit Macopy"}
      </button>
    </main>
  );
};

export default App;

import { useEffect, useState } from "react";
import useMeasure from "react-use-measure";
import type { HistoryItem } from "../shared/types";
import styles from "./App.module.css";
import { copyText, tauriApi } from "./api/tauri";

const api = tauriApi;

const App = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [trayVisible, setTrayVisible] = useState<boolean>(true);
  const [ref, bounds] = useMeasure();
  const isJapanese = navigator.language.startsWith("ja");

  useEffect(() => {
    api.onHistory((data: HistoryItem[]) => {
      setHistory(data);
    });
  }, []);

  useEffect(() => {
    (async () => {
      const result = await api.getTrayIconState();
      setTrayVisible(result);
    })();
  }, []);

  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
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
        if (item) {
          if (item.type === "text") {
            await copyText(item.content);
          } else {
            api.copyImage(item.content);
          }
          await api.hideWindow();
          await api.pasteFromClipboard();
        }
      } else if (/^[0-9]$/.test(e.key)) {
        const pressed = Number(e.key);
        const index = pressed === 0 ? 9 : pressed - 1;
        if (index < history.length) {
          const item = history[index];
          if (item.type === "text") {
            await copyText(item.content);
          } else {
            api.copyImage(item.content);
          }
          await api.hideWindow();
          await api.pasteFromClipboard();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [history, selectedIndex]);

  useEffect(() => {
    api.updateWindowHeight(bounds.height);
  }, [bounds.height]);

  const handleItemClick = async (item: HistoryItem) => {
    if (item.type === "text") {
      await copyText(item.content);
    } else {
      api.copyImage(item.content);
    }
    await api.hideWindow();
    await api.pasteFromClipboard();
  };

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
          onClick={() => handleItemClick(item)}
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
          api.toggleTrayIcon();
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
          api.quitApp();
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

import React, { useEffect, useState } from "react";
import styles from "./App.module.css";
import useMeasure from "react-use-measure";

type HistoryItem =
  | { type: "text"; content: string }
  | { type: "image"; content: string };

const App = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [trayVisible, setTrayVisible] = useState<boolean>(true);
  const [ref, bounds] = useMeasure();

  useEffect(() => {
    (window as any).macopy.onHistory((data: HistoryItem[]) => {
      setHistory(data);
    });
  }, []);

  useEffect(() => {
    (async () => {
      const result = await (window as any).macopy?.getTrayIconState?.();
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
            (window as any).macopy?.hideWindow();
            (window as any).macopy?.pasteFromClipboard();
          });
        } else {
          (window as any).macopy?.copyImage?.(item.content);
          (window as any).macopy?.hideWindow();
          (window as any).macopy?.pasteFromClipboard();
        }
      } else if (/^[0-9]$/.test(e.key)) {
        const pressed = Number(e.key);
        const index = pressed === 0 ? 9 : pressed - 1;
        if (index < history.length) {
          const item = history[index];
          if (item.type === "text") {
            navigator.clipboard.writeText(item.content).then(() => {
              (window as any).macopy?.hideWindow();
              (window as any).macopy?.pasteFromClipboard();
            });
          } else {
            (window as any).macopy?.copyImage?.(item.content);
            (window as any).macopy?.hideWindow();
            (window as any).macopy?.pasteFromClipboard();
          }
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [history, selectedIndex]);

  useEffect(() => {
    (window as any).macopy?.updateWindowHeight?.(bounds.height);
  }, [bounds.height]);

  return (
    <main className={styles.root} ref={ref}>
      {history.map((item, index) => (
        <div
          className={`${styles.item} ${
            index === selectedIndex && selectedIndex !== -1
              ? styles.selected
              : ""
          }`}
          key={index}
          onClick={async () => {
            if (item.type === "text") {
              await navigator.clipboard.writeText(item.content);
            } else {
              (window as any).macopy?.copyImage?.(item.content);
            }
            (window as any).macopy?.hideWindow();
            (window as any).macopy?.pasteFromClipboard();
          }}
          onMouseEnter={() => {
            setSelectedIndex(index);
          }}
        >
          <div>
            {item.type === "text" ? (
              <div className={styles.text}>{item.content.slice(0, 100)}</div>
            ) : (
              <div className={styles.imageContainer}>
                <img src={item.content} className={styles.image} />
              </div>
            )}
          </div>
          <div className={styles.num}>{index < 9 ? index + 1 : 0}</div>
        </div>
      ))}
      {history.length > 0 ? <hr className={styles.hr} /> : null}
      <div
        className={`${styles.item} ${styles.toggle}`}
        onClick={() => {
          (window as any).macopy.toggleTrayIcon();
          setTrayVisible((prev) => !prev);
        }}
        onMouseEnter={() => {
          setSelectedIndex(-1);
        }}
      >
        {trayVisible ? "メニューバーから非表示" : "メニューバーに表示"}
      </div>
      <div
        className={`${styles.item} ${styles.close}`}
        onClick={() => {
          window.close();
        }}
        onMouseEnter={() => {
          setSelectedIndex(-1);
        }}
      >
        Macopy を終了
      </div>
    </main>
  );
};

export default App;

"use client";
import styles from "./page.module.css";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Zap,
  Brain,
  ImageIcon,
  LayoutPanelTop,
  Apple,
  Download,
  Github,
} from "lucide-react";

export default function Page(): React.JSX.Element {
  return (
    <main className={styles.page}>
      <motion.div
        className={styles.main}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className={styles.titleRow}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Image
            src="/icon.png"
            width={48}
            height={48}
            alt="App icon"
            className={styles.icon}
          />
          <h1 className={styles.title}>Macopy</h1>
        </motion.div>

        <p className={styles.subtitle}>
          Inspired by Clipy, Macopy is a minimal clipboard history tool for
          macOS. Simple, fast, and built for keyboard lovers.
        </p>

        <motion.div
          className={styles.cta}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <a
            href="https://github.com/piro0919/macopy/releases/latest"
            className={styles.button}
            target="_blank"
            rel="noreferrer"
          >
            <Download size={20} />
            Download for macOS
          </a>
          <a
            href="https://github.com/piro0919/macopy"
            className={styles.button}
            target="_blank"
            rel="noreferrer"
          >
            <Github size={20} />
            View on GitHub
          </a>
        </motion.div>

        <div className={styles.section}>
          <div className={styles.featureGrid}>
            <motion.div
              className={styles.featureItem}
              whileHover={{ scale: 1.02 }}
            >
              <div className={styles.featureTitleRow}>
                <ClipboardList size={20} />
                <h3>Clipboard History</h3>
              </div>
              <p>Tracks your latest 10 copied items (text and images).</p>
            </motion.div>
            <motion.div
              className={styles.featureItem}
              whileHover={{ scale: 1.02 }}
            >
              <div className={styles.featureTitleRow}>
                <Zap size={20} />
                <h3>Global Shortcut</h3>
              </div>
              <p>Invoke the popup instantly with a customizable key combo.</p>
            </motion.div>
            <motion.div
              className={styles.featureItem}
              whileHover={{ scale: 1.02 }}
            >
              <div className={styles.featureTitleRow}>
                <Brain size={20} />
                <h3>App Detection</h3>
              </div>
              <p>
                Detects the active app and pastes automatically via AppleScript.
              </p>
            </motion.div>
            <motion.div
              className={styles.featureItem}
              whileHover={{ scale: 1.02 }}
            >
              <div className={styles.featureTitleRow}>
                <ImageIcon size={20} />
                <h3>Image Support</h3>
              </div>
              <p>Supports copying and pasting images (e.g. screenshots).</p>
            </motion.div>
            <motion.div
              className={styles.featureItem}
              whileHover={{ scale: 1.02 }}
            >
              <div className={styles.featureTitleRow}>
                <LayoutPanelTop size={20} />
                <h3>Tray Integration</h3>
              </div>
              <p>Access your history and settings from the menu bar.</p>
            </motion.div>
            <motion.div
              className={styles.featureItem}
              whileHover={{ scale: 1.02 }}
            >
              <div className={styles.featureTitleRow}>
                <Apple size={20} />
                <h3>macOS Native</h3>
              </div>
              <p>No Dock icon, minimal UI, dark mode friendly.</p>
            </motion.div>
          </div>
        </div>

        <div className={styles.section}>
          <motion.div
            className={styles.screenshotRow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className={styles.screenshotText}>
              <h3>Clipboard History</h3>
              <p>
                Press your shortcut and instantly access your recent clipboard
                items. Navigate with the keyboard and hit Enter to paste. It's
                that fast.
              </p>
            </div>
            <Image
              src="/screenshot1.png"
              width={480}
              height={320}
              alt="Clipboard screenshot"
              className={styles.screenshotImage}
            />
          </motion.div>

          <motion.div
            className={styles.screenshotRow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <Image
              src="/screenshot2.png"
              width={480}
              height={320}
              alt="Tray menu screenshot"
              className={styles.screenshotImage}
            />
            <div className={styles.screenshotText}>
              <h3>Tray Access</h3>
              <p>
                Not just for keyboard ninjas—click from the tray to quickly
                access your history or tweak visibility settings.
              </p>
            </div>
          </motion.div>
        </div>

        <div className={styles.footer}>
          <div>
            Compatible with macOS. Accessibility permission is required.
            <br />
            Built with Electron, React, and ❤️
          </div>
          <span>
            &copy; 2025{" "}
            <a
              href="https://kk-web.link/"
              target="_blank"
              rel="noopener noreferrer"
            >
              kk-web
            </a>
          </span>
        </div>
      </motion.div>
    </main>
  );
}

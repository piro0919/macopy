import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Macopy keeps your clipboard history on your own Mac and never sends it anywhere. Here is exactly where it is stored and what that means.",
  alternates: { canonical: "/privacy" },
};

export default function Privacy() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: August 22, 2026</p>

        <p>
          Macopy watches your clipboard, which is about as personal as it gets.
          So the important part first: none of it goes anywhere. The app makes
          no network requests at all — not for analytics, not for updates, not
          for anything. There is no server behind it and no account.
        </p>

        <h2>Where your history is kept</h2>
        <p>
          Everything you copy is written to a single file inside your own
          Library folder, on your Mac, and read back from there. Deleting that
          file, or the app&apos;s support folder, clears the history for good.
        </p>

        <h2>The file is plain text, and that matters</h2>
        <p>
          History is stored unencrypted. Anything you copy is saved as it was
          copied, and right now Macopy does not skip items that password
          managers mark as secret. If you copy a password, it lands in that
          file in readable form, the same as any other entry.
        </p>
        <p>
          That file is inside your user account, so another account on the Mac
          can&apos;t read it — but anything running as you can. If that
          isn&apos;t a trade you want, clear the history after copying
          something sensitive, or quit Macopy before you do.
        </p>

        <h2>Why it asks for accessibility and automation</h2>
        <p>
          Picking an item pastes it into whatever app you were using, and macOS
          treats driving another app that way as accessibility and automation.
          Those permissions exist for pasting and nothing else. They are not
          used to read other apps&apos; windows or contents.
        </p>

        <h2>No analytics, and no update check either</h2>
        <p>
          There is no crash reporting, no usage tracking, no unique identifier,
          and no third-party SDK. The app does not phone home to look for new
          versions — you get those from GitHub when you go and get them.
        </p>

        <h2>You can check all of this</h2>
        <p>
          Macopy is open source under the MIT license, so none of the above has
          to be taken on trust.{" "}
          <a href="https://github.com/piro0919/macopy">Read the source</a> or
          open an issue there if something looks wrong.
        </p>

        <h2>Changes</h2>
        <p>
          If a future version starts doing something new with your data, this
          page gets updated before that version ships.
        </p>

        <p className={styles.back}>
          <Link href="/">← Back to Macopy</Link>
        </p>
      </main>
    </div>
  );
}

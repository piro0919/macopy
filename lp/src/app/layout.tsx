import type { Metadata } from "next";
import "./globals.css";

const title = "Macopy";
const description =
  "A minimal clipboard history tool for macOS — inspired by Clipy, optimized for speed and simplicity.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: "https://macopy.kk-web.link",
    siteName: title,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

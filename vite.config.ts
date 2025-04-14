import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { copyFileSync } from "fs";
import { resolve } from "path";

// ビルド時に preload.js をコピー
copyFileSync(
  resolve(__dirname, "main/preload.js"),
  resolve(__dirname, "dist/preload.js")
);
copyFileSync(
  resolve(__dirname, "assets/trayTemplate.png"),
  resolve(__dirname, "dist/trayTemplate.png")
);

export default defineConfig({
  base: "./",
  root: "renderer",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./renderer"),
    },
  },
});

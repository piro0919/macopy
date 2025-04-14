const { copyFileSync } = require("fs");
const { resolve } = require("path");

copyFileSync(
  resolve(__dirname, "../main/preload.js"),
  resolve(__dirname, "../dist/preload.js")
);
copyFileSync(
  resolve(__dirname, "../assets/trayTemplate.png"),
  resolve(__dirname, "../dist/trayTemplate.png")
);

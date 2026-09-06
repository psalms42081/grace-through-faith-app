const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const { execFileSync } = require("child_process");

const config = getDefaultConfig(__dirname);

// Stamp a per-build id into dist/sw.js after `expo export` so browsers
// treat the controlling worker as new. `web:export` also runs this script.
if (process.argv.includes("export") && !global.__imStampSwAfterExport) {
  global.__imStampSwAfterExport = true;
  let stamped = false;
  const stampSw = () => {
    if (stamped) return;
    const script = path.join(__dirname, "scripts", "copy-web-pwa-assets.mjs");
    try {
      execFileSync(process.execPath, [script], {
        stdio: "inherit",
        cwd: __dirname,
      });
      stamped = true;
    } catch (error) {
      console.warn("[pwa] Could not stamp service worker build id:", error.message);
    }
  };
  const originalExit = process.exit;
  process.exit = function exitWithSwStamp(code) {
    if (code === undefined || code === 0) stampSw();
    return originalExit.call(this, code);
  };
  process.on("beforeExit", (code) => {
    if (code === 0 || code === undefined) stampSw();
  });
}

config.watcher = {
  ...config.watcher,
  additionalExts: config.watcher?.additionalExts || [],
};

const blockList = [
  new RegExp(path.resolve(__dirname, ".local").replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "/.*"),
  new RegExp(path.resolve(__dirname, "artifacts/mockup-sandbox").replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "/.*"),
];

if (config.resolver.blockList) {
  if (Array.isArray(config.resolver.blockList)) {
    config.resolver.blockList = [...config.resolver.blockList, ...blockList];
  } else {
    config.resolver.blockList = [config.resolver.blockList, ...blockList];
  }
} else {
  config.resolver.blockList = blockList;
}

module.exports = config;

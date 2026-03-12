const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.watcher = {
  ...config.watcher,
  additionalExts: config.watcher?.additionalExts || [],
};

const blockList = [
  new RegExp(path.resolve(__dirname, ".local/state/workflow-logs").replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "/.*"),
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

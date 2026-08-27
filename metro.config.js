const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  /[/\\]node_modules[/\\]\.bin(?:[/\\].*)?$/,
  /\/__tests__\/.*/,
];

if (!config.resolver.assetExts.includes("csv")) {
  config.resolver.assetExts.push("csv");
}

module.exports = config;

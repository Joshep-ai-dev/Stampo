const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  /[/\\]node_modules[/\\]\.bin(?:[/\\].*)?$/,
  /\/__tests__\/.*/,
];

// React Native 0.81.5 can send Expo's `unstable_path` query parameter with
// its percent escapes encoded twice. Decode it once before Metro resolves the
// asset, so filenames with spaces remain supported in the development client.
const previousEnhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const nextMiddleware = previousEnhanceMiddleware
    ? previousEnhanceMiddleware(middleware, server)
    : middleware;

  return (req, res, next) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const unstablePath = url.searchParams.get("unstable_path");

      if (unstablePath?.startsWith(".%2F")) {
        url.searchParams.set("unstable_path", decodeURIComponent(unstablePath));
        req.url = `${url.pathname}${url.search}`;
      }
    } catch {
      // Leave malformed or non-asset requests to Metro's normal handling.
    }

    return nextMiddleware(req, res, next);
  };
};

module.exports = config;

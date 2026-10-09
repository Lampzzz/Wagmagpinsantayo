// Learn more https://docs.expo.dev/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// three.js ships a deprecated CommonJS entry that calls Node's `process.emitWarning` when it
// loads. React Native has no such function, so the app crashes with "undefined is not a
// function". Native bundles reach that entry through the "require" export condition (web
// doesn't), so point every import of 'three' at the ES module build instead.
const THREE_ESM = path.resolve(__dirname, 'node_modules/three/build/three.module.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') {
    return { type: 'sourceFile', filePath: THREE_ESM };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

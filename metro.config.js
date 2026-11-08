const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const upstream = config.resolver.resolveRequest;

// Thème global : React Native normalise toutes ses couleurs par ce module ; on le remplace par un branchement qui
// applique le thème du membre aux couleurs de la charte (voir `src/lib/color-remap.ts`).
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@react-native/normalize-colors') {
    return { type: 'sourceFile', filePath: path.resolve(__dirname, 'src/lib/normalize-colors-remap.js') };
  }
  return (upstream ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;

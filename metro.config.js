// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add svg transformer for react-native-svg
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

// Handle node: scheme URLs
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  events: require.resolve('events'),
  stream: require.resolve('stream-browserify'),
  path: require.resolve('path-browserify'),
  url: require.resolve('url'),
  util: require.resolve('util'),
  buffer: require.resolve('buffer'),
  'string_decoder': require.resolve('string_decoder')
};

// Customize the resolver to handle node: URLs
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Redirect node: URLs to our fallbacks
  if (moduleName.startsWith('node:')) {
    const actualModuleName = moduleName.slice(5); // Remove the 'node:' prefix
    
    if (actualModuleName === 'fs' || actualModuleName === 'fs/promises') {
      // Return null for fs to use an empty module
      return {
        filePath: require.resolve('./src/utils/emptyModule.js'),
        type: 'sourceFile',
      };
    }
    
    // For other node: URLs, try to resolve to our fallbacks
    if (config.resolver.extraNodeModules[actualModuleName]) {
      return {
        filePath: config.resolver.extraNodeModules[actualModuleName],
        type: 'sourceFile',
      };
    }
  }
  
  // For everything else, use the default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
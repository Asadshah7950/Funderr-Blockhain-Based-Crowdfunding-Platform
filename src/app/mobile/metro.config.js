const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Block resolution to parent directories to avoid picking up wrong packages
config.resolver.blockList = [
  // Block parent node_modules
  new RegExp(path.resolve(__dirname, '../../..', 'node_modules').replace(/\\/g, '\\\\') + '/.*'),
  // Block blockchain folder (ethers causes issues in React Native)
  new RegExp(path.resolve(__dirname, '../../..', 'src/blockchain').replace(/\\/g, '\\\\') + '/.*'),
];

// Only watch the mobile folder
config.watchFolders = [__dirname];

module.exports = config;

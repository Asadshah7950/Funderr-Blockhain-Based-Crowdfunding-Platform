// webpack.config.js - extend expo webpack config
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function(env, argv) {
  // Use Expo's default webpack config
  const config = await createExpoWebpackConfigAsync(env, argv);
  // Add alias so packages that require '@react-native-vector-icons/material-design-icons'
  // resolve to the web-friendly Expo vector icon implementation
  if (!config.resolve) config.resolve = {};
  if (!config.resolve.alias) config.resolve.alias = {};
  config.resolve.alias['@react-native-vector-icons/material-design-icons'] =
    require.resolve('@expo/vector-icons/MaterialCommunityIcons');

  return config;
};

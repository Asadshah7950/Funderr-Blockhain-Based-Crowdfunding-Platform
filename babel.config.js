module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Add any additional babel plugins here
    ],
    env: {
      production: {
        // For production builds, plugins to optimize code
      },
    },
    overrides: [
      // Disable source maps for vector-icons to avoid warnings
      {
        test: /node_modules[\/\\](@expo[\/\\]vector-icons|react-native-vector-icons)/,
        sourceMaps: false,
      },
    ],
  };
};

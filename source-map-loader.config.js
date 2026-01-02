// This is a custom source-map-loader configuration file
module.exports = {
  ignore: [
    // Ignore all @expo/vector-icons source maps
    /[\\/]node_modules[\\/]@expo[\\/]vector-icons[\\/]/,
    // Ignore all react-native-vector-icons source maps
    /[\\/]node_modules[\\/]react-native-vector-icons[\\/]/
  ]
};

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import { LogBox } from 'react-native';

// Ignore non-critical warnings to clean up the console
LogBox.ignoreLogs([
  /Failed to parse source map/,
  /Require cycle/,
  /node_modules\/react-native-vector-icons/,
  /node_modules\/@expo\/vector-icons/,
  /Cannot find module/,
  /ENOENT: no such file or directory/,
  "Module not found: Can't resolve '@react-native-vector-icons/material-design-icons'"
]);

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

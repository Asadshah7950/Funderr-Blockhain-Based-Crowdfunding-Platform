/**
 * Funderr Mobile App
 * Main entry point for the Expo React Native app
 */

import 'react-native-get-random-values';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { WalletProvider } from './src/context/WalletContext';
import Web3Provider from './src/providers/Web3Provider';

export default function App() {
  return (
    <SafeAreaProvider>
      <Web3Provider>
        <WalletProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </WalletProvider>
      </Web3Provider>
    </SafeAreaProvider>
  );
}

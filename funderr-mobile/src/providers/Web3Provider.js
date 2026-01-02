/**
 * Web3 Provider for WalletConnect Integration
 * Wraps the app with wagmi and Web3Modal configuration
 */

import React from 'react';
import { createWeb3Modal, defaultWagmiConfig, Web3Modal } from '@web3modal/wagmi-react-native';
import { WagmiConfig } from 'wagmi';
import { mainnet, sepolia } from 'viem/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WALLETCONNECT_PROJECT_ID, APP_METADATA } from '../config/wallet.config';

// Create query client
const queryClient = new QueryClient();

// Define chains
const chains = [mainnet, sepolia];

// Create wagmi config
const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId: WALLETCONNECT_PROJECT_ID,
  metadata: APP_METADATA,
});

// Initialize Web3Modal
createWeb3Modal({
  projectId: WALLETCONNECT_PROJECT_ID,
  chains,
  wagmiConfig,
  enableAnalytics: false,
  metadata: APP_METADATA,
});

// Web3 Provider Component
export const Web3Provider = ({ children }) => {
  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Web3Modal />
      </QueryClientProvider>
    </WagmiConfig>
  );
};

export default Web3Provider;

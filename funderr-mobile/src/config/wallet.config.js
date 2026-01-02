/**
 * Wallet Configuration for Web3Modal/WalletConnect
 */

// WalletConnect Project ID - Get yours at https://cloud.walletconnect.com
export const WALLETCONNECT_PROJECT_ID = '3a8170812b534d0ff9d794f19a901d64';

// Supported chains
export const SUPPORTED_CHAINS = {
  mainnet: {
    id: 1,
    name: 'Ethereum',
    network: 'mainnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://eth.llamarpc.com'] },
      public: { http: ['https://eth.llamarpc.com'] },
    },
    blockExplorers: {
      default: { name: 'Etherscan', url: 'https://etherscan.io' },
    },
  },
  sepolia: {
    id: 11155111,
    name: 'Sepolia',
    network: 'sepolia',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://rpc.sepolia.org'] },
      public: { http: ['https://rpc.sepolia.org'] },
    },
    blockExplorers: {
      default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
    },
    testnet: true,
  },
};

// App metadata for WalletConnect
export const APP_METADATA = {
  name: 'Funderr',
  description: 'Blockchain-based crowdfunding platform',
  url: 'https://funderr.app',
  icons: ['https://funderr.app/icon.png'],
  redirect: {
    native: 'funderr://',
    universal: 'https://funderr.app',
  },
};

// Default network
export const DEFAULT_NETWORK = 'sepolia';

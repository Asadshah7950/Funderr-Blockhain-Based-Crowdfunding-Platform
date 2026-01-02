/**
 * Wallet Service for MetaMask Integration via WalletConnect
 * Handles wallet connection, transactions, and balance queries
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking, Platform } from 'react-native';
import { ethers } from 'ethers';

// Storage keys
const WALLET_ADDRESS_KEY = 'walletAddress';
const WALLET_CONNECTED_KEY = 'walletConnected';
const WALLET_NETWORK_KEY = 'walletNetwork';

// WalletConnect Project ID - Get yours at https://cloud.walletconnect.com
const WALLETCONNECT_PROJECT_ID = '3a8170812b534d0ff9d794f19a901d64';

// Ethereum RPC endpoints - Using Alchemy for reliable access
const RPC_ENDPOINTS = {
  mainnet: 'https://eth.llamarpc.com',
  sepolia: 'https://eth-sepolia.g.alchemy.com/v2/JKr_0zzfptD4Ie6et6JPg',
  goerli: 'https://rpc.ankr.com/eth_goerli',
};

// Chain IDs
const CHAIN_IDS = {
  mainnet: 1,
  sepolia: 11155111,
  goerli: 5,
};

// Default network
const DEFAULT_NETWORK = 'sepolia';

class WalletService {
  constructor() {
    this.address = null;
    this.isConnected = false;
    this.balance = '0';
    this.network = DEFAULT_NETWORK;
    this.provider = null;
    this.listeners = [];
    this.connectionInProgress = false;
  }

  // Initialize ethers provider
  initProvider() {
    if (!this.provider || this.provider.connection?.url !== RPC_ENDPOINTS[this.network]) {
      this.provider = new ethers.providers.JsonRpcProvider(
        RPC_ENDPOINTS[this.network]
      );
    }
    return this.provider;
  }

  // Add listener for wallet state changes
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // Notify all listeners of state change
  notifyListeners() {
    this.listeners.forEach(callback => {
      callback({
        isConnected: this.isConnected,
        address: this.address,
        balance: this.balance,
        network: this.network,
      });
    });
  }

  // Initialize wallet from storage
  async initialize() {
    try {
      this.initProvider();
      
      const savedAddress = await AsyncStorage.getItem(WALLET_ADDRESS_KEY);
      const savedConnected = await AsyncStorage.getItem(WALLET_CONNECTED_KEY);
      const savedNetwork = await AsyncStorage.getItem(WALLET_NETWORK_KEY);
      
      if (savedNetwork && RPC_ENDPOINTS[savedNetwork]) {
        this.network = savedNetwork;
        this.initProvider();
      }
      
      if (savedAddress && savedConnected === 'true') {
        // Validate the saved address
        if (ethers.utils.isAddress(savedAddress)) {
          this.address = ethers.utils.getAddress(savedAddress);
          this.isConnected = true;
          // Fetch current balance from blockchain
          await this.fetchBalance();
          this.notifyListeners();
        } else {
          // Invalid address, clear storage
          await this.disconnect();
        }
      }
    } catch (error) {
      console.error('Error initializing wallet:', error);
    }
  }

  // Update wallet state from Web3Modal/wagmi connection
  async updateFromWeb3Modal(address, chainId) {
    try {
      if (address && ethers.utils.isAddress(address)) {
        this.address = ethers.utils.getAddress(address);
        this.isConnected = true;
        
        // Update network based on chainId
        if (chainId === 1) {
          this.network = 'mainnet';
        } else if (chainId === 11155111) {
          this.network = 'sepolia';
        }
        
        this.initProvider();
        await this.fetchBalance();
        
        // Save to storage
        await AsyncStorage.setItem(WALLET_ADDRESS_KEY, this.address);
        await AsyncStorage.setItem(WALLET_CONNECTED_KEY, 'true');
        await AsyncStorage.setItem(WALLET_NETWORK_KEY, this.network);
        
        this.notifyListeners();
        
        return {
          success: true,
          address: this.address,
          balance: this.balance,
          network: this.network,
        };
      }
    } catch (error) {
      console.error('Error updating from Web3Modal:', error);
    }
  }

  // Check if MetaMask is installed
  async isMetaMaskInstalled() {
    try {
      const canOpen = await Linking.canOpenURL('metamask://');
      return canOpen;
    } catch {
      return false;
    }
  }

  // Open MetaMask app store
  openMetaMaskStore() {
    const storeUrl = Platform.OS === 'ios'
      ? 'https://apps.apple.com/app/metamask/id1438144202'
      : 'https://play.google.com/store/apps/details?id=io.metamask';
    
    Linking.openURL(storeUrl);
  }

  // Open MetaMask app
  async openMetaMask() {
    try {
      await Linking.openURL('metamask://');
      return true;
    } catch (e) {
      console.log('Could not open MetaMask:', e);
      return false;
    }
  }

  // Connect wallet with provided address
  async connectWithAddress(walletAddress) {
    try {
      // Validate the address using ethers
      if (!ethers.utils.isAddress(walletAddress)) {
        throw new Error('Invalid Ethereum address');
      }

      // Checksum the address
      this.address = ethers.utils.getAddress(walletAddress);
      this.isConnected = true;

      // Fetch real balance from blockchain
      await this.fetchBalance();

      // Save to storage
      await AsyncStorage.setItem(WALLET_ADDRESS_KEY, this.address);
      await AsyncStorage.setItem(WALLET_CONNECTED_KEY, 'true');
      await AsyncStorage.setItem(WALLET_NETWORK_KEY, this.network);

      this.notifyListeners();

      return {
        success: true,
        address: this.address,
        balance: this.balance,
        network: this.network,
      };
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }

  // Main connect method - opens MetaMask and waits for address input
  async connect() {
    try {
      // Check if MetaMask is installed
      const isInstalled = await this.isMetaMaskInstalled();
      
      if (!isInstalled) {
        return {
          success: false,
          requiresInstall: true,
          message: 'MetaMask not installed',
        };
      }

      // Open MetaMask app
      await this.openMetaMask();

      return {
        success: true,
        requiresAddress: true,
        message: 'Please copy your wallet address from MetaMask and enter it',
      };
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }

  // Disconnect wallet
  async disconnect() {
    try {
      this.address = null;
      this.isConnected = false;
      this.balance = '0';

      await AsyncStorage.removeItem(WALLET_ADDRESS_KEY);
      await AsyncStorage.setItem(WALLET_CONNECTED_KEY, 'false');

      this.notifyListeners();

      return { success: true };
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      throw error;
    }
  }

  // Fetch wallet balance using ethers.js
  async fetchBalance() {
    if (!this.address) return '0';

    try {
      this.initProvider();
      
      const balanceWei = await this.provider.getBalance(this.address);
      const balanceEth = ethers.utils.formatEther(balanceWei);
      this.balance = parseFloat(balanceEth).toFixed(6);
      
      this.notifyListeners();
      return this.balance;
    } catch (error) {
      console.error('Error fetching balance:', error);
      return this.balance || '0';
    }
  }

  // Get current wallet state
  getState() {
    return {
      isConnected: this.isConnected,
      address: this.address,
      balance: this.balance,
      network: this.network,
    };
  }

  // Switch network
  async switchNetwork(network) {
    if (RPC_ENDPOINTS[network]) {
      this.network = network;
      this.provider = new ethers.providers.JsonRpcProvider(
        RPC_ENDPOINTS[network]
      );
      await AsyncStorage.setItem(WALLET_NETWORK_KEY, network);
      
      if (this.isConnected) {
        await this.fetchBalance();
      }
    }
  }

  // Get network name
  getNetworkName() {
    const names = {
      mainnet: 'Ethereum Mainnet',
      sepolia: 'Sepolia Testnet',
      goerli: 'Goerli Testnet',
    };
    return names[this.network] || this.network;
  }

  // Get chain ID
  getChainId() {
    return CHAIN_IDS[this.network] || 1;
  }

  // Send ETH transaction - Opens MetaMask with transaction details
  async sendTransaction(toAddress, amountEth) {
    if (!this.isConnected || !this.address) {
      throw new Error('Wallet not connected');
    }

    if (!ethers.utils.isAddress(toAddress)) {
      throw new Error('Invalid recipient address');
    }

    try {
      // Convert ETH to Wei
      const amountWei = ethers.utils.parseEther(amountEth.toString());
      const amountHex = amountWei.toHexString();

      // MetaMask deep link for sending transaction
      const chainId = this.getChainId();
      const checksumAddress = ethers.utils.getAddress(toAddress);
      
      // Try metamask app link first
      const metamaskUrl = `https://metamask.app.link/send/${checksumAddress}@${chainId}?value=${amountHex}`;
      
      let opened = false;
      try {
        const canOpen = await Linking.canOpenURL(metamaskUrl);
        if (canOpen) {
          await Linking.openURL(metamaskUrl);
          opened = true;
        }
      } catch (e) {
        console.log('Cannot open metamask app link:', e);
      }

      if (!opened) {
        // Fallback to basic metamask deep link
        await Linking.openURL(`metamask://send?address=${checksumAddress}&value=${amountEth}`);
      }

      return {
        success: true,
        status: 'pending_confirmation',
        message: 'Please confirm the transaction in MetaMask',
        from: this.address,
        to: checksumAddress,
        amount: amountEth,
        chainId: chainId,
      };
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  }

  // Get transaction receipt
  async getTransactionReceipt(txHash) {
    try {
      this.initProvider();
      const receipt = await this.provider.getTransactionReceipt(txHash);
      return receipt;
    } catch (error) {
      console.error('Error getting transaction receipt:', error);
      return null;
    }
  }

  // Wait for transaction confirmation
  async waitForTransaction(txHash, confirmations = 1) {
    try {
      this.initProvider();
      const receipt = await this.provider.waitForTransaction(txHash, confirmations);
      return receipt;
    } catch (error) {
      console.error('Error waiting for transaction:', error);
      throw error;
    }
  }

  // Format address for display
  formatAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // Validate Ethereum address
  isValidAddress(address) {
    return ethers.utils.isAddress(address);
  }

  // Get ENS name for address (mainnet only)
  async getEnsName(address) {
    if (this.network !== 'mainnet') return null;
    
    try {
      const mainnetProvider = new ethers.providers.JsonRpcProvider(RPC_ENDPOINTS.mainnet);
      const ensName = await mainnetProvider.lookupAddress(address);
      return ensName;
    } catch (error) {
      console.error('Error getting ENS name:', error);
      return null;
    }
  }

  // Resolve ENS name to address (mainnet only)
  async resolveEnsName(ensName) {
    try {
      const mainnetProvider = new ethers.providers.JsonRpcProvider(RPC_ENDPOINTS.mainnet);
      const address = await mainnetProvider.resolveName(ensName);
      return address;
    } catch (error) {
      console.error('Error resolving ENS name:', error);
      return null;
    }
  }
}

// Export singleton instance
export const walletService = new WalletService();
export default walletService;

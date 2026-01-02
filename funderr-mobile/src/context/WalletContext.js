/**
 * Wallet Context for Global Wallet State Management
 * Integrates with Web3Modal/wagmi for automatic wallet connection
 * Uses proper WalletConnect for transaction signing (like OpenSea/Uniswap)
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWeb3Modal } from '@web3modal/wagmi-react-native';
import { 
  useAccount, 
  useBalance, 
  useDisconnect, 
  useChainId,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { parseEther } from 'viem';
import walletService from '../services/WalletService';
import blockchainService from '../services/BlockchainService';

// FunderrCampaign ABI - for contract interactions
const CAMPAIGN_ABI = [
  {
    "inputs": [],
    "name": "donateSimple",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "_message", "type": "string"}],
    "name": "donate",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "raised",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "creator",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdrawn",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Create context
const WalletContext = createContext(null);

// Wallet Provider Component
export const WalletProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [balance, setBalance] = useState('0');
  const [network, setNetwork] = useState('sepolia');
  const [error, setError] = useState(null);
  
  // Transaction state
  const [pendingTxHash, setPendingTxHash] = useState(null);
  const [txStatus, setTxStatus] = useState('idle'); // 'idle' | 'pending' | 'confirming' | 'success' | 'error'
  const [txError, setTxError] = useState(null);
  
  // Web3Modal hooks
  const { open: openWeb3Modal } = useWeb3Modal();
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  // Only fetch balance when we have an address
  const { data: wagmiBalance } = useBalance({ 
    address: wagmiAddress,
    query: {
      enabled: !!wagmiAddress, // Only run query when address exists
    }
  });
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const chainId = useChainId();
  
  // ============ WAGMI TRANSACTION HOOKS (Professional Flow) ============
  const { 
    sendTransaction: wagmiSendTransaction,
    data: txHash,
    isPending: isTxPending,
    isError: isTxError,
    error: txSendError,
    reset: resetTx,
  } = useSendTransaction();
  
  // Contract write hook for calling smart contract functions
  const {
    writeContract,
    data: contractTxHash,
    isPending: isContractPending,
    isError: isContractError,
    error: contractError,
    reset: resetContractTx,
  } = useWriteContract();
  
  // Wait for transaction receipt (confirmation)
  const { 
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError: isReceiptError,
    error: receiptError,
    data: txReceipt,
  } = useWaitForTransactionReceipt({
    hash: pendingTxHash,
  });
  
  // Update transaction status based on wagmi hooks
  useEffect(() => {
    if (isTxPending || isContractPending) {
      setTxStatus('pending');
      console.log('📤 Transaction pending user confirmation...');
    }
  }, [isTxPending, isContractPending]);
  
  useEffect(() => {
    // Track both regular tx and contract tx hashes
    const hash = txHash || contractTxHash;
    if (hash) {
      setPendingTxHash(hash);
      setTxStatus('confirming');
      console.log('⏳ Transaction sent, waiting for confirmation:', hash);
    }
  }, [txHash, contractTxHash]);
  
  useEffect(() => {
    if (isConfirming) {
      setTxStatus('confirming');
      console.log('⏳ Transaction is being confirmed on blockchain...');
    }
  }, [isConfirming]);
  
  useEffect(() => {
    if (isConfirmed && txReceipt) {
      setTxStatus('success');
      console.log('✅ Transaction confirmed!', txReceipt);
      // Refresh balance after successful transaction
      setTimeout(() => refreshBalance(), 2000);
    }
  }, [isConfirmed, txReceipt]);
  
  useEffect(() => {
    if (isTxError || isReceiptError || isContractError) {
      const errorMessage = txSendError?.message || receiptError?.message || contractError?.message || 'Transaction failed';
      setTxStatus('error');
      setTxError(errorMessage);
      console.log('❌ Transaction failed:', {
        isTxError,
        isReceiptError,
        isContractError,
        txSendError: txSendError?.message,
        receiptError: receiptError?.message,
        contractError: contractError?.message,
        fullTxError: txSendError,
        fullReceiptError: receiptError,
        fullContractError: contractError,
      });
    }
  }, [isTxError, isReceiptError, isContractError, txSendError, receiptError, contractError]);

  // Fetch real-time balance from blockchain
  const fetchRealTimeBalance = useCallback(async (address) => {
    if (!address) return '0';
    try {
      const realBalance = await blockchainService.getWalletBalance(address);
      console.log('Real-time balance for', address, ':', realBalance);
      return realBalance || '0';
    } catch (err) {
      console.error('Error fetching real-time balance:', err);
      return '0';
    }
  }, []);

  // Sync wagmi state with local state
  useEffect(() => {
    const syncWalletState = async () => {
      if (wagmiConnected && wagmiAddress) {
        setIsConnected(true);
        setWalletAddress(wagmiAddress);
        
        // Update network based on chainId
        if (chainId === 1) {
          setNetwork('mainnet');
        } else if (chainId === 11155111) {
          setNetwork('sepolia');
        }
        
        // Sync with wallet service
        walletService.updateFromWeb3Modal(wagmiAddress, chainId);
        
        // Fetch real-time balance from blockchain
        const realBalance = await fetchRealTimeBalance(wagmiAddress);
        setBalance(realBalance);
      }
    };
    
    syncWalletState();
  }, [wagmiConnected, wagmiAddress, chainId, fetchRealTimeBalance]);

  // Also use wagmi balance as fallback
  useEffect(() => {
    if (wagmiBalance?.formatted && (!balance || balance === '0')) {
      try {
        const formattedBalance = parseFloat(wagmiBalance.formatted).toFixed(6);
        if (!isNaN(formattedBalance)) {
          setBalance(formattedBalance);
        }
      } catch (e) {
        console.log('Error formatting wagmi balance:', e);
      }
    }
  }, [wagmiBalance, balance]);

  // Initialize wallet on mount
  useEffect(() => {
    const initWallet = async () => {
      await walletService.initialize();
      const state = walletService.getState();
      // Only set from storage if not connected via wagmi
      if (!wagmiConnected) {
        setIsConnected(state.isConnected);
        setWalletAddress(state.address);
        
        // Fetch real balance if address exists
        if (state.address) {
          const realBalance = await fetchRealTimeBalance(state.address);
          setBalance(realBalance);
        } else {
          setBalance(state.balance);
        }
        setNetwork(state.network || 'sepolia');
      }
    };

    initWallet();

    // Subscribe to wallet state changes
    const unsubscribe = walletService.addListener(async (state) => {
      // Only update if not managed by wagmi
      if (!wagmiConnected) {
        setIsConnected(state.isConnected);
        setWalletAddress(state.address);
        
        // Fetch real balance
        if (state.address) {
          const realBalance = await fetchRealTimeBalance(state.address);
          setBalance(realBalance);
        } else {
          setBalance(state.balance);
        }
        setNetwork(state.network || 'sepolia');
      }
    });

    return () => unsubscribe();
  }, [wagmiConnected, fetchRealTimeBalance]);

  // Connect wallet using Web3Modal
  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Open Web3Modal for wallet selection
      await openWeb3Modal();
      return { success: true };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [openWeb3Modal]);

  // Connect with specific address
  const connectWithAddress = useCallback(async (address) => {
    setIsConnecting(true);
    setError(null);

    try {
      const result = await walletService.connectWithAddress(address);
      setIsConnected(true);
      setWalletAddress(result.address);
      setBalance(result.balance);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    try {
      // Disconnect from wagmi/Web3Modal
      if (wagmiConnected) {
        wagmiDisconnect();
      }
      // Also clear local storage
      await walletService.disconnect();
      setIsConnected(false);
      setWalletAddress(null);
      setBalance('0');
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [wagmiConnected, wagmiDisconnect]);

  // Refresh balance from blockchain
  const refreshBalance = useCallback(async () => {
    try {
      const addressToUse = wagmiAddress || walletAddress;
      if (!addressToUse) return '0';
      
      // Fetch real-time balance from blockchain
      const realBalance = await blockchainService.getWalletBalance(addressToUse);
      if (realBalance) {
        setBalance(realBalance);
        return realBalance;
      }
      
      // Fallback to wallet service
      const newBalance = await walletService.fetchBalance();
      setBalance(newBalance);
      return newBalance;
    } catch (err) {
      console.error('Error refreshing balance:', err);
      return balance;
    }
  }, [wagmiAddress, walletAddress, balance]);

  // Switch network
  const switchNetwork = useCallback(async (newNetwork) => {
    try {
      await walletService.switchNetwork(newNetwork);
      setNetwork(newNetwork);
    } catch (err) {
      console.error('Error switching network:', err);
    }
  }, []);

  // ============ PROPER TRANSACTION FUNCTIONS (WalletConnect/wagmi) ============
  
  /**
   * Send ETH transaction using wagmi (Professional flow like OpenSea)
   * This will open MetaMask modal, wait for confirmation, and return actual result
   * @param {string} toAddress - Recipient address (wallet or contract)
   * @param {string} amountEth - Amount in ETH (e.g., "0.1")
   * @param {boolean} isContract - Whether the recipient is a smart contract
   * @returns {Promise<{success: boolean, hash?: string, error?: string}>}
   */
  const sendEthTransaction = useCallback(async (toAddress, amountEth, isContract = false) => {
    console.log('📤 Initiating ETH transaction via WalletConnect...');
    console.log('   To:', toAddress);
    console.log('   Amount:', amountEth, 'ETH');
    console.log('   Is Contract:', isContract);
    
    // Reset previous transaction state
    resetTx();
    resetContractTx();
    setTxStatus('idle');
    setTxError(null);
    setPendingTxHash(null);
    
    try {
      // Validate inputs
      if (!toAddress || !toAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error('Invalid recipient address');
      }
      
      const amount = parseFloat(amountEth);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid amount');
      }
      
      // Check balance
      const currentBalance = parseFloat(balance || '0');
      if (amount > currentBalance) {
        throw new Error(`Insufficient balance. You have ${currentBalance.toFixed(4)} ETH`);
      }
      
      // Prepare transaction value
      const valueInWei = parseEther(amountEth.toString());
      
      if (isContract) {
        // For smart contracts, call the donateSimple() function
        console.log('📝 Calling contract donateSimple() function...');
        writeContract({
          address: toAddress,
          abi: CAMPAIGN_ABI,
          functionName: 'donateSimple',
          value: valueInWei,
          chainId: 11155111, // Sepolia testnet
        });
      } else {
        // For regular wallets, send plain ETH transfer
        console.log('📝 Sending plain ETH transfer...');
        wagmiSendTransaction({
          to: toAddress,
          value: valueInWei,
          chainId: 11155111, // Sepolia testnet
        });
      }
      
      // Return immediately - the actual result will be tracked via hooks
      return { 
        success: true, 
        status: 'pending',
        message: 'Transaction initiated. Please confirm in your wallet.' 
      };
    } catch (err) {
      console.error('❌ Transaction initiation failed:', err);
      setTxStatus('error');
      setTxError(err.message);
      return { 
        success: false, 
        error: err.message 
      };
    }
  }, [balance, wagmiSendTransaction, writeContract, resetTx, resetContractTx]);

  /**
   * Withdraw funds from a campaign smart contract
   * Only the campaign creator can call this function
   * @param {string} campaignContractAddress - The campaign contract address
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const withdrawFromCampaign = useCallback(async (campaignContractAddress) => {
    console.log('💰 Initiating withdrawal from campaign...');
    console.log('   Contract:', campaignContractAddress);
    
    // Reset previous transaction state
    resetTx();
    resetContractTx();
    setTxStatus('idle');
    setTxError(null);
    setPendingTxHash(null);
    
    try {
      if (!isConnected || !walletAddress) {
        throw new Error('Wallet not connected');
      }

      if (!campaignContractAddress || !campaignContractAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error('Invalid campaign contract address');
      }

      // Call withdraw function on the campaign contract
      console.log('📝 Calling contract withdraw() function...');
      writeContract({
        address: campaignContractAddress,
        abi: CAMPAIGN_ABI,
        functionName: 'withdraw',
        chainId: 11155111, // Sepolia testnet
      });

      return { 
        success: true, 
        status: 'pending',
        message: 'Withdrawal initiated. Please confirm in your wallet.' 
      };
    } catch (err) {
      console.error('❌ Withdrawal initiation failed:', err);
      setTxStatus('error');
      setTxError(err.message);
      return { 
        success: false, 
        error: err.message 
      };
    }
  }, [isConnected, walletAddress, writeContract, resetTx, resetContractTx]);

  /**
   * Reset transaction state (call before starting a new transaction)
   */
  const resetTransaction = useCallback(() => {
    resetTx();
    resetContractTx();
    setTxStatus('idle');
    setTxError(null);
    setPendingTxHash(null);
  }, [resetTx, resetContractTx]);

  /**
   * Get current transaction status
   * @returns {{ status: string, hash?: string, error?: string, receipt?: object }}
   */
  const getTransactionStatus = useCallback(() => {
    return {
      status: txStatus,
      hash: pendingTxHash,
      error: txError,
      receipt: txReceipt,
      isConfirming,
      isConfirmed,
    };
  }, [txStatus, pendingTxHash, txError, txReceipt, isConfirming, isConfirmed]);

  // Legacy sendTransaction (fallback to walletService)
  const sendTransaction = useCallback(async (toAddress, amount) => {
    // Use new wagmi-based transaction
    return sendEthTransaction(toAddress, amount);
  }, [sendEthTransaction]);

  // Format address helper
  const formatAddress = useCallback((address) => {
    return walletService.formatAddress(address || walletAddress);
  }, [walletAddress]);

  // Get network name
  const getNetworkName = useCallback(() => {
    return walletService.getNetworkName();
  }, []);

  // Validate address
  const isValidAddress = useCallback((address) => {
    return walletService.isValidAddress(address);
  }, []);

  // Context value
  const value = {
    // State
    isConnected,
    isConnecting,
    walletAddress,
    balance,
    network,
    error,
    
    // Transaction state (for UI updates)
    txStatus,
    txHash: pendingTxHash,
    txError,
    txReceipt,
    isConfirming,
    isConfirmed,

    // Actions
    connect,
    connectWithAddress,
    disconnect,
    refreshBalance,
    switchNetwork,
    sendTransaction,
    
    // New transaction functions (Professional flow)
    sendEthTransaction,
    withdrawFromCampaign,
    resetTransaction,
    getTransactionStatus,
    
    // Helpers
    formatAddress,
    getNetworkName,
    isValidAddress,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

// Custom hook to use wallet context
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export default WalletContext;

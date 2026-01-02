/**
 * Blockchain Service for Funderr Mobile - Factory Pattern
 * Each campaign has its own contract address
 * Handles smart contract interactions for donations with self-donation prevention
 */

import { ethers } from 'ethers';
import { Linking, Platform } from 'react-native';

// Factory Contract ABI - Only what we need
const FACTORY_ABI = [
  "function getCampaignAddress(uint256 _campaignId) external view returns (address)",
  "function isValidCampaign(address _campaignAddress) external view returns (bool)",
  "function campaignCount() external view returns (uint256)",
];

// Individual Campaign Contract ABI - Functions needed for donations
const CAMPAIGN_ABI = [
  // Donation functions
  "function donate(string memory _message) external payable",
  "function donateSimple() external payable",
  
  // View functions
  "function creator() external view returns (address)",
  "function title() external view returns (string memory)",
  "function goal() external view returns (uint256)",
  "function raised() external view returns (uint256)",
  "function deadline() external view returns (uint256)",
  "function donorCount() external view returns (uint256)",
  "function active() external view returns (bool)",
  "function withdrawn() external view returns (bool)",
  "function getCampaignDetails() external view returns (address _creator, string memory _title, string memory _description, uint256 _goal, uint256 _deadline, uint256 _raised, uint256 _donorCount, bool _withdrawn, bool _active, string memory _imageHash)",
  "function getProgress() external view returns (uint256)",
  "function getTimeRemaining() external view returns (uint256)",
  "function getDonationAmount(address _donor) external view returns (uint256)",
  "function isCreator(address _address) external view returns (bool)",
  "function getBalance() external view returns (uint256)",
  
  // Events
  "event DonationReceived(address indexed donor, uint256 amount, string message, uint256 timestamp)",
];

// Configuration
const CONFIG = {
  // Factory contract address (creates individual campaign contracts)
  factoryAddress: process.env.EXPO_PUBLIC_FACTORY_ADDRESS || '0xd1E7fFF77fB16F0AeBC1415c639cC15D5D50534d',
  
  // Legacy single contract (kept for reference)
  legacyContractAddress: process.env.EXPO_PUBLIC_CONTRACT_ADDRESS || '0x9689502C6036Be77A8404d0fA502B89BFAf76aA4',
  
  // RPC endpoints - using Alchemy for reliable Sepolia access
  rpcUrls: {
    mainnet: 'https://eth.llamarpc.com',
    sepolia: 'https://eth-sepolia.g.alchemy.com/v2/JKr_0zzfptD4Ie6et6JPg',
  },
  
  // Chain IDs
  chainIds: {
    mainnet: 1,
    sepolia: 11155111,
  },
  
  // Default network
  defaultNetwork: 'sepolia',
};

class BlockchainService {
  constructor() {
    this.provider = null;
    this.factoryContract = null;
    this.network = CONFIG.defaultNetwork;
  }

  /**
   * Initialize the provider and factory contract
   */
  initialize(network = CONFIG.defaultNetwork) {
    this.network = network;
    const rpcUrl = CONFIG.rpcUrls[network];
    
    if (!rpcUrl) {
      throw new Error(`Unknown network: ${network}`);
    }
    
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.factoryContract = new ethers.Contract(
      CONFIG.factoryAddress,
      FACTORY_ABI,
      this.provider
    );
    
    return this;
  }

  /**
   * Get provider instance
   */
  getProvider() {
    if (!this.provider) {
      this.initialize();
    }
    return this.provider;
  }

  /**
   * Get factory contract instance
   */
  getFactoryContract() {
    if (!this.factoryContract) {
      this.initialize();
    }
    return this.factoryContract;
  }

  /**
   * Get campaign contract instance by address
   */
  getCampaignContract(campaignContractAddress) {
    const provider = this.getProvider();
    return new ethers.Contract(campaignContractAddress, CAMPAIGN_ABI, provider);
  }

  /**
   * Get wallet balance from blockchain
   */
  async getBalance(address) {
    try {
      const provider = this.getProvider();
      const balanceWei = await provider.getBalance(address);
      const balanceEth = ethers.utils.formatEther(balanceWei);
      return parseFloat(balanceEth).toFixed(6);
    } catch (error) {
      console.error('Error fetching balance:', error);
      throw error;
    }
  }

  /**
   * Alias for getBalance
   */
  async getWalletBalance(address) {
    return this.getBalance(address);
  }

  /**
   * Get campaign contract address from factory by ID
   */
  async getCampaignAddressById(blockchainId) {
    try {
      const factory = this.getFactoryContract();
      return await factory.getCampaignAddress(blockchainId);
    } catch (error) {
      console.error('Error getting campaign address:', error);
      return null;
    }
  }

  /**
   * Get campaign details from its individual contract
   */
  async getCampaignFromContract(campaignContractAddress) {
    try {
      const contract = this.getCampaignContract(campaignContractAddress);
      const details = await contract.getCampaignDetails();
      
      return {
        contractAddress: campaignContractAddress,
        creator: details[0],
        title: details[1],
        description: details[2],
        goal: ethers.utils.formatEther(details[3]),
        goalWei: details[3].toString(),
        deadline: new Date(details[4].toNumber() * 1000),
        raised: ethers.utils.formatEther(details[5]),
        raisedWei: details[5].toString(),
        donorCount: details[6].toNumber(),
        withdrawn: details[7],
        active: details[8],
        imageHash: details[9],
      };
    } catch (error) {
      console.error('Error fetching campaign from contract:', error);
      throw error;
    }
  }

  /**
   * Check if user is the creator of a campaign (SELF-DONATION PREVENTION)
   */
  async isCreator(campaignContractAddress, walletAddress) {
    try {
      const contract = this.getCampaignContract(campaignContractAddress);
      return await contract.isCreator(walletAddress);
    } catch (error) {
      console.error('Error checking if creator:', error);
      return false;
    }
  }

  /**
   * Check if user can donate (not creator, campaign active, deadline not passed)
   */
  async canDonate(campaignContractAddress, walletAddress) {
    try {
      const contract = this.getCampaignContract(campaignContractAddress);
      
      // Check 1: Is the user the creator?
      const isCreator = await contract.isCreator(walletAddress);
      if (isCreator) {
        return {
          canDonate: false,
          reason: 'Campaign creators cannot donate to their own campaigns',
          isCreator: true,
        };
      }
      
      // Check 2: Is campaign active?
      const active = await contract.active();
      if (!active) {
        return {
          canDonate: false,
          reason: 'This campaign is no longer active',
          isCreator: false,
        };
      }
      
      // Check 3: Has deadline passed?
      const deadline = await contract.deadline();
      if (deadline.toNumber() < Math.floor(Date.now() / 1000)) {
        return {
          canDonate: false,
          reason: 'This campaign has ended',
          isCreator: false,
        };
      }
      
      return {
        canDonate: true,
        reason: 'Eligible to donate',
        isCreator: false,
      };
    } catch (error) {
      console.error('Error checking donation eligibility:', error);
      return {
        canDonate: false,
        reason: error.message || 'Error checking eligibility',
        isCreator: false,
      };
    }
  }

  /**
   * Check if campaign is active for donations
   */
  async isCampaignActive(campaignContractAddress) {
    try {
      const contract = this.getCampaignContract(campaignContractAddress);
      return await contract.active();
    } catch (error) {
      console.error('Error checking campaign status:', error);
      return false;
    }
  }

  /**
   * Get campaign progress percentage
   */
  async getCampaignProgress(campaignContractAddress) {
    try {
      const contract = this.getCampaignContract(campaignContractAddress);
      const progress = await contract.getProgress();
      return progress.toNumber();
    } catch (error) {
      console.error('Error fetching campaign progress:', error);
      return 0;
    }
  }

  /**
   * Get donation amount by a donor for a campaign
   */
  async getDonationAmount(campaignContractAddress, donorAddress) {
    try {
      const contract = this.getCampaignContract(campaignContractAddress);
      const amount = await contract.getDonationAmount(donorAddress);
      return ethers.utils.formatEther(amount);
    } catch (error) {
      console.error('Error fetching donation amount:', error);
      return '0';
    }
  }

  /**
   * Create MetaMask deep link for donation to individual campaign contract
   */
  createDonationDeepLink(campaignContractAddress, amountEth) {
    const chainId = CONFIG.chainIds[this.network];
    const amountWei = ethers.utils.parseEther(amountEth.toString());
    const amountHex = amountWei.toHexString();
    
    // Create contract call data for donateSimple function (no parameters)
    const iface = new ethers.utils.Interface(CAMPAIGN_ABI);
    const data = iface.encodeFunctionData('donateSimple', []);
    
    // MetaMask deep link to campaign's individual contract
    const deepLink = `https://metamask.app.link/send/${campaignContractAddress}@${chainId}?value=${amountHex}&data=${data}`;
    
    return deepLink;
  }

  /**
   * Create a simple ETH transfer deep link (for direct wallet transfers)
   */
  createTransferDeepLink(toAddress, amountEth) {
    const chainId = CONFIG.chainIds[this.network];
    const amountWei = ethers.utils.parseEther(amountEth.toString());
    const amountHex = amountWei.toHexString();
    
    const deepLink = `https://metamask.app.link/send/${toAddress}@${chainId}?value=${amountHex}`;
    
    return deepLink;
  }

  /**
   * Open MetaMask with donation transaction
   */
  async openMetaMaskForDonation(campaignContractAddress, amountEth, fallbackWalletAddress = null) {
    try {
      let deepLink;
      
      if (campaignContractAddress) {
        // Use individual campaign contract for donation
        deepLink = this.createDonationDeepLink(campaignContractAddress, amountEth);
      } else if (fallbackWalletAddress) {
        // Use direct wallet transfer as fallback
        deepLink = this.createTransferDeepLink(fallbackWalletAddress, amountEth);
      } else {
        throw new Error('Either campaignContractAddress or fallbackWalletAddress is required');
      }
      
      console.log('Opening MetaMask with deep link:', deepLink);
      
      const canOpen = await Linking.canOpenURL(deepLink);
      if (canOpen) {
        await Linking.openURL(deepLink);
        return { success: true, message: 'MetaMask opened for transaction' };
      } else {
        // Try basic MetaMask deep link
        await Linking.openURL('metamask://');
        return { success: true, message: 'MetaMask opened' };
      }
    } catch (error) {
      console.error('Error opening MetaMask:', error);
      throw error;
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash) {
    try {
      const provider = this.getProvider();
      return await provider.getTransactionReceipt(txHash);
    } catch (error) {
      console.error('Error getting transaction receipt:', error);
      return null;
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txHash, confirmations = 1) {
    try {
      const provider = this.getProvider();
      return await provider.waitForTransaction(txHash, confirmations);
    } catch (error) {
      console.error('Error waiting for transaction:', error);
      throw error;
    }
  }

  /**
   * Validate Ethereum address
   */
  isValidAddress(address) {
    return ethers.utils.isAddress(address);
  }

  /**
   * Format ETH amount for display
   */
  formatEth(weiAmount) {
    return ethers.utils.formatEther(weiAmount);
  }

  /**
   * Parse ETH to Wei
   */
  parseEth(ethAmount) {
    return ethers.utils.parseEther(ethAmount.toString());
  }

  /**
   * Get gas estimate for donation
   */
  async estimateGas() {
    const gasLimit = 150000; // Higher for contract interaction
    try {
      const provider = this.getProvider();
      const gasPrice = await provider.getGasPrice();
      const gasCostWei = gasPrice.mul(gasLimit);
      return {
        gasLimit,
        gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei'),
        gasCostEth: ethers.utils.formatEther(gasCostWei),
      };
    } catch (error) {
      console.error('Error estimating gas:', error);
      return {
        gasLimit,
        gasPrice: '20',
        gasCostEth: '0.003',
      };
    }
  }

  /**
   * Get network info
   */
  getNetworkInfo() {
    return {
      network: this.network,
      chainId: CONFIG.chainIds[this.network],
      factoryAddress: CONFIG.factoryAddress,
      rpcUrl: CONFIG.rpcUrls[this.network],
    };
  }

  /**
   * Switch network
   */
  switchNetwork(network) {
    if (!CONFIG.rpcUrls[network]) {
      throw new Error(`Unknown network: ${network}`);
    }
    this.initialize(network);
    return this.getNetworkInfo();
  }

  /**
   * Get Etherscan URL for a campaign contract
   */
  getCampaignEtherscanUrl(campaignContractAddress) {
    const baseUrl = this.network === 'mainnet' 
      ? 'https://etherscan.io' 
      : 'https://sepolia.etherscan.io';
    return `${baseUrl}/address/${campaignContractAddress}`;
  }

  /**
   * Get Etherscan URL for a transaction
   */
  getTransactionEtherscanUrl(txHash) {
    const baseUrl = this.network === 'mainnet' 
      ? 'https://etherscan.io' 
      : 'https://sepolia.etherscan.io';
    return `${baseUrl}/tx/${txHash}`;
  }

  /**
   * Donate to campaign - Opens MetaMask for transaction approval
   * With SELF-DONATION PREVENTION
   * @param {Object} campaign - Campaign object with campaignContractAddress
   * @param {string} amountEth - Amount in ETH
   * @param {string} fromAddress - Sender's wallet address
   * @returns {Promise<{success: boolean, transactionHash?: string, error?: string}>}
   */
  async donateToCampaign(campaign, amountEth, fromAddress) {
    try {
      console.log('BlockchainService.donateToCampaign called (Factory Pattern)');
      console.log('Campaign:', campaign?.title || 'Unknown');
      console.log('Amount:', amountEth);
      console.log('From address:', fromAddress);

      // Extract campaign data
      const campaignContractAddress = campaign?.campaignContractAddress;
      const walletAddress = campaign?.walletAddress;
      const creatorId = campaign?.creatorId;
      
      console.log('Campaign Contract Address:', campaignContractAddress);
      console.log('Fallback Wallet Address:', walletAddress);

      // Validate inputs
      if (!amountEth || parseFloat(amountEth) <= 0) {
        return { success: false, error: 'Invalid donation amount' };
      }

      if (!fromAddress || !this.isValidAddress(fromAddress)) {
        return { success: false, error: 'Invalid wallet address' };
      }

      // Check wallet balance
      const balance = await this.getBalance(fromAddress);
      if (parseFloat(balance) < parseFloat(amountEth)) {
        return { 
          success: false, 
          error: `Insufficient balance. You have ${balance} ETH but trying to donate ${amountEth} ETH` 
        };
      }

      // ============ SELF-DONATION PREVENTION ============
      if (campaignContractAddress) {
        // Check on blockchain if donor is the creator
        const eligibility = await this.canDonate(campaignContractAddress, fromAddress);
        
        if (!eligibility.canDonate) {
          console.log('Donation blocked:', eligibility.reason);
          return {
            success: false,
            error: eligibility.reason,
            isCreator: eligibility.isCreator,
          };
        }
      }

      // Determine which method to use for donation
      let result;
      
      if (campaignContractAddress && this.isValidAddress(campaignContractAddress)) {
        // Campaign has individual contract - use it directly
        console.log('Using individual campaign contract:', campaignContractAddress);
        
        const isActive = await this.isCampaignActive(campaignContractAddress);
        console.log('Campaign active:', isActive);
        
        if (isActive) {
          result = await this.openMetaMaskForDonation(campaignContractAddress, amountEth);
        } else if (walletAddress && this.isValidAddress(walletAddress)) {
          console.log('Campaign not active, using direct transfer to:', walletAddress);
          result = await this.openMetaMaskForDonation(null, amountEth, walletAddress);
        } else {
          return {
            success: false,
            error: 'Campaign is no longer active and has no fallback wallet',
          };
        }
      } else if (walletAddress && this.isValidAddress(walletAddress)) {
        // No contract but has wallet address - use direct transfer
        console.log('Using direct transfer to wallet:', walletAddress);
        result = await this.openMetaMaskForDonation(null, amountEth, walletAddress);
      } else {
        // Campaign not configured for blockchain
        return { 
          success: false, 
          error: 'Campaign is pending blockchain registration. Please try again after admin approval.' 
        };
      }

      // Generate a pending transaction ID
      const pendingTxId = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        success: true,
        message: 'Please complete the transaction in MetaMask',
        transactionHash: pendingTxId,
        isPending: true,
        method: campaignContractAddress ? 'campaign_contract' : 'direct_transfer',
        campaignContractAddress: campaignContractAddress,
        etherscanUrl: campaignContractAddress ? this.getCampaignEtherscanUrl(campaignContractAddress) : null,
      };
    } catch (error) {
      console.error('Donation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to process donation',
      };
    }
  }

  /**
   * Donate using MetaMask - alias for donateToCampaign
   */
  async donateWithMetaMask(campaign, amountEth, fromAddress) {
    return this.donateToCampaign(campaign, amountEth, fromAddress);
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();
export default blockchainService;

/**
 * Backend Blockchain Service for Funderr - Factory Pattern
 * Each campaign gets its own contract address
 * Handles smart contract interactions for campaign management
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Factory ABI from artifacts
let FACTORY_ABI;
let CAMPAIGN_ABI;

try {
  const factoryArtifactPath = path.join(__dirname, '../blockchain/artifacts/contracts/FunderrFactory.sol/FunderrFactory.json');
  if (fs.existsSync(factoryArtifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(factoryArtifactPath, 'utf8'));
    FACTORY_ABI = artifact.abi;
    console.log('✅ Loaded Factory ABI from artifacts');
  }
} catch (error) {
  console.log('⚠️ Could not load Factory ABI from artifacts, using inline ABI');
}

try {
  const campaignArtifactPath = path.join(__dirname, '../blockchain/artifacts/contracts/FunderrCampaign.sol/FunderrCampaign.json');
  if (fs.existsSync(campaignArtifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(campaignArtifactPath, 'utf8'));
    CAMPAIGN_ABI = artifact.abi;
    console.log('✅ Loaded Campaign ABI from artifacts');
  }
} catch (error) {
  console.log('⚠️ Could not load Campaign ABI from artifacts, using inline ABI');
}

// Fallback ABIs if artifacts not found
if (!FACTORY_ABI) {
  FACTORY_ABI = [
    "function createCampaign(address _creator, string memory _title, string memory _description, uint256 _goal, uint256 _durationDays, string memory _imageHash) external returns (uint256 campaignId, address campaignAddress)",
    "function getCampaignAddress(uint256 _campaignId) external view returns (address)",
    "function getCampaignDetails(uint256 _campaignId) external view returns (address campaignAddress, address creator, string memory title, uint256 goal, uint256 raised, bool active)",
    "function getCreatorCampaigns(address _creator) external view returns (uint256[] memory)",
    "function isValidCampaign(address _campaignAddress) external view returns (bool)",
    "function getTotalCampaigns() external view returns (uint256)",
    "function deactivateCampaign(uint256 _campaignId) external",
    "function updatePlatformWallet(address _newWallet) external",
    "function getFactoryInfo() external view returns (address _owner, address _platformWallet, uint256 _campaignCount, bool _paused)",
    "function campaignCount() external view returns (uint256)",
    "event CampaignCreated(uint256 indexed campaignId, address indexed campaignContract, address indexed creator, string title, uint256 goal, uint256 deadline, uint256 timestamp)",
  ];
}

if (!CAMPAIGN_ABI) {
  CAMPAIGN_ABI = [
    "function donate(string memory _message) external payable",
    "function donateSimple() external payable",
    "function withdraw() external",
    "function claimRefund() external",
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
    "function getAllDonors() external view returns (address[] memory)",
    "function getDonationHistoryCount() external view returns (uint256)",
    "function getDonationHistoryEntry(uint256 _index) external view returns (address donor, uint256 amount, string memory message, uint256 timestamp)",
    "function getBalance() external view returns (uint256)",
    "function isCreator(address _address) external view returns (bool)",
    "function canClaimRefund(address _donor) external view returns (bool)",
    "event DonationReceived(address indexed donor, uint256 amount, string message, uint256 timestamp)",
    "event FundsWithdrawn(address indexed creator, uint256 amount, uint256 platformFee, uint256 timestamp)",
    "event RefundClaimed(address indexed donor, uint256 amount, uint256 timestamp)",
  ];
}

// Network configurations
const NETWORKS = {
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: process.env.SEPOLIA_RPC_URL || process.env.SEPOLIA_RPC || 'https://eth-sepolia.g.alchemy.com/v2/demo',
    explorer: 'https://sepolia.etherscan.io',
  },
  mainnet: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: process.env.MAINNET_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
    explorer: 'https://etherscan.io',
  },
  localhost: {
    chainId: 31337,
    name: 'Localhost',
    rpcUrl: 'http://127.0.0.1:8545',
    explorer: null,
  }
};

// Default to Sepolia for testing
const DEFAULT_NETWORK = process.env.BLOCKCHAIN_NETWORK || 'sepolia';

class BlockchainService {
  constructor() {
    this.network = NETWORKS[DEFAULT_NETWORK];
    this.provider = null;
    this.wallet = null;
    this.factoryContract = null;
    this.factoryAddress = process.env.FACTORY_ADDRESS || null;
    this.isInitialized = false;
  }

  /**
   * Initialize the blockchain service
   */
  async init() {
    try {
      console.log('🔗 Initializing Blockchain Service (Factory Pattern)...');
      console.log('📡 Network:', this.network.name);
      console.log('🌐 RPC URL:', this.network.rpcUrl);
      
      // Create provider
      this.provider = new ethers.JsonRpcProvider(this.network.rpcUrl);
      
      // Test provider connection
      try {
        const blockNumber = await this.provider.getBlockNumber();
        console.log('📦 Current block number:', blockNumber);
      } catch (e) {
        console.warn('⚠️ Could not get block number:', e.message);
      }
      
      // Create wallet from private key (for server-side transactions)
      const privateKey = process.env.PLATFORM_PRIVATE_KEY || process.env.PRIVATE_KEY;
      if (privateKey) {
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        console.log('💰 Platform wallet:', this.wallet.address);
        
        // Check wallet balance
        try {
          const balance = await this.provider.getBalance(this.wallet.address);
          console.log('💵 Wallet balance:', ethers.formatEther(balance), 'ETH');
        } catch (e) {
          console.warn('⚠️ Could not get wallet balance:', e.message);
        }
      } else {
        console.warn('⚠️ PRIVATE_KEY not set - blockchain write operations will be limited');
      }
      
      // Connect to factory contract if address is available
      if (this.factoryAddress) {
        this.factoryContract = new ethers.Contract(
          this.factoryAddress,
          FACTORY_ABI,
          this.wallet || this.provider
        );
        console.log('🏭 Factory address:', this.factoryAddress);
        
        // Verify factory exists
        try {
          const campaignCount = await this.factoryContract.campaignCount();
          console.log('📊 Total campaigns created:', campaignCount.toString());
        } catch (e) {
          console.warn('⚠️ Could not read from factory:', e.message);
        }
        
        this.isInitialized = true;
      } else {
        console.warn('⚠️ FACTORY_ADDRESS not set - deploy the factory first');
        this.isInitialized = false;
      }
      
      console.log('✅ Blockchain Service initialized (Factory Pattern)');
      return this.isInitialized;
    } catch (error) {
      console.error('❌ Blockchain Service initialization failed:', error.message);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Check if blockchain service is ready
   */
  isReady() {
    return this.isInitialized && this.factoryContract !== null && this.wallet !== null;
  }

  /**
   * Create a campaign on the blockchain (Factory Pattern)
   * Returns both the campaign ID and the individual campaign contract address
   */
  async createCampaignOnBlockchain(creatorWalletAddress, title, description, goalInEth, durationDays, imageHash = '') {
    try {
      if (!this.isReady()) {
        console.log('⚠️ Blockchain not configured, skipping on-chain campaign creation');
        return {
          success: false,
          error: 'Blockchain service not configured. Deploy factory first.',
          blockchainId: null,
          campaignContractAddress: null,
          transactionHash: null,
        };
      }

      console.log('📝 Creating campaign contract via Factory...');
      console.log('   Creator:', creatorWalletAddress);
      console.log('   Title:', title);
      console.log('   Goal:', goalInEth, 'ETH');
      console.log('   Duration:', durationDays, 'days');

      // Use platform wallet if creator wallet not provided
      const creator = creatorWalletAddress || this.wallet.address;

      // Convert goal to Wei
      const goalInWei = ethers.parseEther(goalInEth.toString());
      console.log('   Goal in Wei:', goalInWei.toString());

      // Estimate gas
      let gasEstimate;
      try {
        gasEstimate = await this.factoryContract.createCampaign.estimateGas(
          creator,
          title,
          description.substring(0, 500),
          goalInWei,
          durationDays,
          imageHash || ''
        );
        console.log('   Estimated gas:', gasEstimate.toString());
      } catch (e) {
        console.log('   Gas estimation failed, using default:', e.message);
        gasEstimate = 3000000n; // Higher gas for contract creation
      }

      // Create campaign via factory
      const tx = await this.factoryContract.createCampaign(
        creator,
        title,
        description.substring(0, 500),
        goalInWei,
        durationDays,
        imageHash || '',
        { gasLimit: gasEstimate + 500000n } // Add buffer for contract creation
      );

      console.log('⏳ Transaction sent:', tx.hash);
      console.log('   View on Etherscan:', this.getTransactionUrl(tx.hash));
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed in block:', receipt.blockNumber);

      // Parse the CampaignCreated event to get campaign details
      let blockchainId = null;
      let campaignContractAddress = null;
      
      for (const log of receipt.logs) {
        try {
          const parsedLog = this.factoryContract.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          if (parsedLog && parsedLog.name === 'CampaignCreated') {
            blockchainId = parsedLog.args.campaignId.toString();
            campaignContractAddress = parsedLog.args.campaignContract;
            console.log('🆔 Blockchain Campaign ID:', blockchainId);
            console.log('📜 Campaign Contract Address:', campaignContractAddress);
            break;
          }
        } catch (e) {
          // Not our event, continue
        }
      }

      // Fallback: get from transaction
      if (!blockchainId || !campaignContractAddress) {
        try {
          const count = await this.factoryContract.campaignCount();
          blockchainId = (Number(count) - 1).toString();
          campaignContractAddress = await this.factoryContract.getCampaignAddress(blockchainId);
          console.log('🆔 Blockchain Campaign ID (from count):', blockchainId);
          console.log('📜 Campaign Contract Address (from lookup):', campaignContractAddress);
        } catch (e) {
          console.warn('Could not get campaign details from fallback');
        }
      }

      return {
        success: true,
        blockchainId: blockchainId,
        campaignContractAddress: campaignContractAddress,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        explorerUrl: this.getTransactionUrl(tx.hash),
        campaignExplorerUrl: campaignContractAddress ? this.getAddressUrl(campaignContractAddress) : null,
      };
    } catch (error) {
      console.error('❌ Blockchain campaign creation failed:', error.message);
      return {
        success: false,
        error: error.message,
        blockchainId: null,
        campaignContractAddress: null,
        transactionHash: null,
      };
    }
  }

  /**
   * Get campaign contract instance
   */
  getCampaignContract(campaignContractAddress) {
    return new ethers.Contract(
      campaignContractAddress,
      CAMPAIGN_ABI,
      this.wallet || this.provider
    );
  }

  /**
   * Get campaign details from its individual contract
   */
  async getCampaignFromBlockchain(campaignContractAddress) {
    try {
      if (!this.provider) {
        return { success: false, error: 'Provider not initialized' };
      }

      const campaignContract = this.getCampaignContract(campaignContractAddress);
      const details = await campaignContract.getCampaignDetails();
      
      return {
        success: true,
        data: {
          contractAddress: campaignContractAddress,
          creator: details[0],
          title: details[1],
          description: details[2],
          goal: ethers.formatEther(details[3]),
          goalWei: details[3].toString(),
          deadline: new Date(Number(details[4]) * 1000).toISOString(),
          deadlineTimestamp: Number(details[4]),
          raised: ethers.formatEther(details[5]),
          raisedWei: details[5].toString(),
          donorCount: Number(details[6]),
          withdrawn: details[7],
          active: details[8],
          imageHash: details[9],
        },
        explorerUrl: this.getAddressUrl(campaignContractAddress),
      };
    } catch (error) {
      console.error('Error getting campaign from blockchain:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if a wallet can donate to a campaign (not the creator)
   */
  async canDonate(campaignContractAddress, donorAddress) {
    try {
      if (!this.provider) {
        return { canDonate: false, reason: 'Provider not initialized' };
      }

      const campaignContract = this.getCampaignContract(campaignContractAddress);
      
      // Check if donor is the creator
      const isCreator = await campaignContract.isCreator(donorAddress);
      if (isCreator) {
        return { 
          canDonate: false, 
          reason: 'Campaign creators cannot donate to their own campaigns',
          isCreator: true
        };
      }

      // Check if campaign is active
      const active = await campaignContract.active();
      if (!active) {
        return { 
          canDonate: false, 
          reason: 'Campaign is not active',
          isCreator: false
        };
      }

      // Check if deadline passed
      const deadline = await campaignContract.deadline();
      if (Number(deadline) < Date.now() / 1000) {
        return { 
          canDonate: false, 
          reason: 'Campaign has ended',
          isCreator: false
        };
      }

      return { 
        canDonate: true, 
        reason: 'Eligible to donate',
        isCreator: false
      };
    } catch (error) {
      console.error('Error checking donation eligibility:', error.message);
      return { canDonate: false, reason: error.message };
    }
  }

  /**
   * Get donations for a campaign from its contract
   */
  async getCampaignDonations(campaignContractAddress) {
    try {
      if (!this.provider) {
        return { success: false, error: 'Provider not initialized', donations: [] };
      }

      const campaignContract = this.getCampaignContract(campaignContractAddress);
      const historyCount = await campaignContract.getDonationHistoryCount();
      
      const donations = [];
      for (let i = 0; i < Number(historyCount); i++) {
        const entry = await campaignContract.getDonationHistoryEntry(i);
        donations.push({
          donor: entry[0],
          amount: ethers.formatEther(entry[1]),
          amountWei: entry[1].toString(),
          message: entry[2],
          timestamp: new Date(Number(entry[3]) * 1000).toISOString(),
        });
      }

      return {
        success: true,
        donations: donations,
        totalDonors: donations.length,
        explorerUrl: this.getAddressUrl(campaignContractAddress),
      };
    } catch (error) {
      console.error('Error getting campaign donations:', error.message);
      return { success: false, error: error.message, donations: [] };
    }
  }

  /**
   * Verify a donation transaction on the blockchain
   */
  async verifyDonation(transactionHash, campaignContractAddress = null) {
    try {
      if (!this.provider) {
        return { success: false, error: 'Provider not initialized' };
      }

      // Skip pending transactions
      if (transactionHash.startsWith('pending_')) {
        return { 
          success: false, 
          status: 'pending',
          message: 'Transaction pending confirmation in wallet' 
        };
      }

      const receipt = await this.provider.getTransactionReceipt(transactionHash);
      
      if (!receipt) {
        return { 
          success: false, 
          status: 'pending',
          message: 'Transaction not yet confirmed' 
        };
      }

      const tx = await this.provider.getTransaction(transactionHash);
      
      // Parse donation event if we have the campaign address
      let donationDetails = null;
      if (campaignContractAddress && receipt.to?.toLowerCase() === campaignContractAddress.toLowerCase()) {
        const campaignContract = this.getCampaignContract(campaignContractAddress);
        for (const log of receipt.logs) {
          try {
            const parsedLog = campaignContract.interface.parseLog({
              topics: log.topics,
              data: log.data
            });
            if (parsedLog && parsedLog.name === 'DonationReceived') {
              donationDetails = {
                donor: parsedLog.args.donor,
                amount: ethers.formatEther(parsedLog.args.amount),
                message: parsedLog.args.message,
                timestamp: new Date(Number(parsedLog.args.timestamp) * 1000).toISOString(),
              };
              break;
            }
          } catch (e) {
            // Not our event
          }
        }
      }

      return {
        success: receipt.status === 1,
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        blockNumber: receipt.blockNumber,
        from: receipt.from,
        to: receipt.to,
        value: tx ? ethers.formatEther(tx.value) : '0',
        gasUsed: receipt.gasUsed.toString(),
        donationDetails,
        explorerUrl: this.getTransactionUrl(transactionHash),
      };
    } catch (error) {
      console.error('Error verifying donation:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get campaign address by blockchain ID
   */
  async getCampaignAddressById(blockchainId) {
    try {
      if (!this.factoryContract) return null;
      return await this.factoryContract.getCampaignAddress(blockchainId);
    } catch (error) {
      console.error('Error getting campaign address:', error.message);
      return null;
    }
  }

  /**
   * Check if campaign is active
   */
  async isCampaignActive(campaignContractAddress) {
    try {
      if (!this.provider) return false;
      const campaignContract = this.getCampaignContract(campaignContractAddress);
      return await campaignContract.active();
    } catch (error) {
      console.error('Error checking campaign status:', error.message);
      return false;
    }
  }

  /**
   * Get campaign balance
   */
  async getCampaignBalance(campaignContractAddress) {
    try {
      if (!this.provider) return '0';
      const campaignContract = this.getCampaignContract(campaignContractAddress);
      const balance = await campaignContract.getBalance();
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting campaign balance:', error.message);
      return '0';
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(address) {
    try {
      if (!this.provider) return '0';
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting balance:', error.message);
      return '0';
    }
  }

  /**
   * Get total campaigns from factory
   */
  async getTotalCampaigns() {
    try {
      if (!this.factoryContract) return 0;
      const count = await this.factoryContract.campaignCount();
      return Number(count);
    } catch (error) {
      console.error('Error getting total campaigns:', error.message);
      return 0;
    }
  }

  /**
   * Get all campaign addresses created by a specific creator
   */
  async getCreatorCampaigns(creatorAddress) {
    try {
      if (!this.factoryContract) return [];
      const campaignIds = await this.factoryContract.getCreatorCampaigns(creatorAddress);
      
      const campaigns = [];
      for (const id of campaignIds) {
        const address = await this.factoryContract.getCampaignAddress(id);
        campaigns.push({
          blockchainId: id.toString(),
          contractAddress: address,
          explorerUrl: this.getAddressUrl(address),
        });
      }
      return campaigns;
    } catch (error) {
      console.error('Error getting creator campaigns:', error.message);
      return [];
    }
  }

  /**
   * Get transaction URL for block explorer
   */
  getTransactionUrl(txHash) {
    if (!this.network.explorer || !txHash) return null;
    return `${this.network.explorer}/tx/${txHash}`;
  }

  /**
   * Get address URL for block explorer
   */
  getAddressUrl(address) {
    if (!this.network.explorer || !address) return null;
    return `${this.network.explorer}/address/${address}`;
  }

  /**
   * Get factory URL for block explorer
   */
  getFactoryUrl() {
    if (!this.network.explorer || !this.factoryAddress) return null;
    return `${this.network.explorer}/address/${this.factoryAddress}`;
  }

  /**
   * Get network info
   */
  getNetworkInfo() {
    return {
      name: this.network.name,
      chainId: this.network.chainId,
      explorer: this.network.explorer,
      factoryAddress: this.factoryAddress,
      isReady: this.isReady(),
      platformWallet: this.wallet?.address || null,
    };
  }

  /**
   * Get factory contract balance
   */
  async getContractBalance() {
    try {
      if (!this.provider || !this.factoryAddress) return '0';
      const balance = await this.provider.getBalance(this.factoryAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting contract balance:', error.message);
      return '0';
    }
  }
}

// Create and export singleton instance
const blockchainService = new BlockchainService();

// Initialize on import
blockchainService.init().catch(err => {
  console.error('Failed to initialize blockchain service:', err.message);
});

export default blockchainService;

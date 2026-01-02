import { ethers } from "ethers";

// Import ABIs directly - Metro bundler compatible
// Try to import Factory Pattern contracts first
let FunderrFactoryArtifact = null;
let FunderrCampaignArtifact = null;

try {
  FunderrFactoryArtifact = require("../blockchain/artifacts/contracts/FunderrFactory.sol/FunderrFactory.json");
  FunderrCampaignArtifact = require("../blockchain/artifacts/contracts/FunderrCampaign.sol/FunderrCampaign.json");
  console.log("✅ Loaded contract ABIs from artifacts");
  console.log("Campaign ABI functions:", FunderrCampaignArtifact?.abi?.filter(x => x.type === 'function').map(x => x.name));
} catch (e) {
  console.warn("Factory Pattern artifacts not found, using fallback ABIs", e);
}

// Campaign ABI for individual campaign contracts (Factory Pattern)
// Using full ABI to ensure all functions are available
const CAMPAIGN_ABI = FunderrCampaignArtifact?.abi || [
  // Donate functions
  {
    "inputs": [{"internalType": "string", "name": "_message", "type": "string"}],
    "name": "donate",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "donateSimple",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  // Withdraw function
  {
    "inputs": [],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // View functions
  {
    "inputs": [],
    "name": "raised",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "goal",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
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
    "name": "active",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
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

// Factory ABI
const FACTORY_ABI = FunderrFactoryArtifact?.abi || [
  "function createCampaign(address, string, string, uint256, uint256, string) external returns (uint256, address)",
  "function getCampaignAddress(uint256) external view returns (address)",
  "function getCampaignDetails(uint256) external view returns (address, address, string, uint256, uint256, bool)",
  "function campaignCount() external view returns (uint256)"
];

// Initialize provider and contract lazily to avoid errors during module load
let provider = null;
let factoryContract = null;

// Factory contract address on Sepolia (same as mobile app)
const FACTORY_ADDRESS = process.env.EXPO_PUBLIC_FACTORY_ADDRESS || "0xd1E7fFF77fB16F0AeBC1415c639cC15D5D50534d";
const rpcUrl = process.env.EXPO_PUBLIC_RPC || "https://eth-sepolia.g.alchemy.com/v2/JKr_0zzfptD4Ie6et6JPg";

// Initialize provider on first use
const initializeProvider = () => {
  if (!provider) {
    try {
      provider = new ethers.JsonRpcProvider(rpcUrl);
    } catch (error) {
      console.error("Failed to initialize provider:", error);
      throw error;
    }
  }
  return provider;
};

// Get Factory contract instance (read-only)
export const getFactoryContract = async () => {
  if (!factoryContract) {
    const prov = initializeProvider();
    try {
      factoryContract = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, prov);
    } catch (error) {
      console.error("Failed to initialize factory contract:", error);
      factoryContract = null;
      throw error;
    }
  }
  return factoryContract;
};

// Get Campaign contract instance (read-only) by address
export const getCampaignContract = async (campaignAddress) => {
  const prov = initializeProvider();
  try {
    return new ethers.Contract(campaignAddress, CAMPAIGN_ABI, prov);
  } catch (error) {
    console.error("Failed to initialize campaign contract:", error);
    throw error;
  }
};

// Get Campaign contract instance with signer for write operations
export const getCampaignContractWithSigner = async (campaignAddress, signer) => {
  try {
    console.log("📝 Creating campaign contract with signer...");
    console.log("Campaign address:", campaignAddress);
    console.log("CAMPAIGN_ABI type:", typeof CAMPAIGN_ABI);
    console.log("CAMPAIGN_ABI is array:", Array.isArray(CAMPAIGN_ABI));
    console.log("CAMPAIGN_ABI length:", CAMPAIGN_ABI?.length);
    
    const contract = new ethers.Contract(campaignAddress, CAMPAIGN_ABI, signer);
    
    // Log available functions
    if (contract.interface) {
      const functions = Object.keys(contract.interface.functions || {});
      console.log("Contract functions available:", functions);
    }
    
    // Check if donateSimple exists
    console.log("Has donateSimple:", typeof contract.donateSimple === 'function');
    console.log("Has donate:", typeof contract.donate === 'function');
    
    return contract;
  } catch (error) {
    console.error("Failed to create campaign contract with signer:", error);
    throw error;
  }
};

// Legacy: Get contract instance (for backward compatibility - now returns factory)
export const getContract = async () => {
  return getFactoryContract();
};

// Legacy: Get contract instance with signer (for backward compatibility)
export const getContractWithSigner = async (signer) => {
  try {
    return new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
  } catch (error) {
    console.error("Failed to create factory contract with signer:", error);
    throw error;
  }
};

/**
 * FACTORY PATTERN DONATION FLOW
 * =============================
 * 1. Campaign is created via Factory → gets unique contract address
 * 2. Donations go to campaign's contract address (not creator wallet)
 * 3. Creator withdraws from their campaign contract when ready
 * 4. Each campaign is visible on Etherscan at its contract address
 */

// Donate to a campaign using its CONTRACT ADDRESS (Factory Pattern)
// Returns the transaction object with a wait() method for tracking
export const donateToContract = async (signer, campaignContractAddress, amount, message = '') => {
  try {
    console.log("🔗 contract.js - Creating donation to campaign contract...");
    console.log("Campaign Contract Address:", campaignContractAddress);
    console.log("Amount:", amount, "ETH");
    
    const campaignContract = await getCampaignContractWithSigner(campaignContractAddress, signer);
    const amountInWei = ethers.parseEther(amount.toString());
    console.log("Amount in Wei:", amountInWei.toString());
    
    console.log("📤 Sending donation to campaign contract...");
    
    // Use donateSimple for no message, donate with message otherwise
    let tx;
    if (message && message.trim()) {
      tx = await campaignContract.donate(message, { value: amountInWei });
    } else {
      tx = await campaignContract.donateSimple({ value: amountInWei });
    }
    
    console.log("✅ Transaction sent! Hash:", tx.hash);
    
    // Return the transaction object (caller should call tx.wait() to confirm)
    return tx;
  } catch (error) {
    console.error("❌ Error donating to contract:", error);
    throw error;
  }
};

// Donate and wait for confirmation (convenience method)
export const donateToContractAndWait = async (signer, campaignContractAddress, amount, message = '') => {
  const tx = await donateToContract(signer, campaignContractAddress, amount, message);
  console.log("⏳ Waiting for confirmation...");
  const receipt = await tx.wait();
  console.log("✅ Transaction confirmed! Block:", receipt.blockNumber);
  return {
    ...receipt,
    hash: tx.hash,
    transactionHash: tx.hash
  };
};

// Legacy donate function - now uses contract address if available
// Returns transaction object (caller should call tx.wait() to confirm)
export const donate = async (signer, campaignIdOrAddress, amount) => {
  try {
    console.log("🔗 contract.js - Creating donation transaction...");
    console.log("Campaign ID/Address:", campaignIdOrAddress, "Amount:", amount);
    
    // Check if this is a contract address (starts with 0x and is 42 chars)
    if (typeof campaignIdOrAddress === 'string' && 
        campaignIdOrAddress.startsWith('0x') && 
        campaignIdOrAddress.length === 42) {
      // Use Factory Pattern - donate directly to campaign contract
      return await donateToContract(signer, campaignIdOrAddress, amount);
    }
    
    // Legacy: If it's a numeric ID, try old method (fallback)
    console.warn("⚠️ Using legacy donation method with campaign ID. Consider using contract address.");
    const campaignContract = await getContractWithSigner(signer);
    const amountInWei = ethers.parseEther(amount.toString());
    
    const tx = await campaignContract.donate(campaignIdOrAddress, { value: amountInWei });
    console.log("✅ Transaction sent! Hash:", tx.hash);
    
    // Return transaction object (caller should call tx.wait() to confirm)
    return tx;
  } catch (error) {
    console.error("❌ Error donating:", error);
    throw error;
  }
};

// Withdraw funds from campaign contract (only campaign creator)
export const withdrawFromContract = async (signer, campaignContractAddress) => {
  try {
    console.log("🔗 contract.js - Withdrawing from campaign contract...");
    console.log("Campaign Contract Address:", campaignContractAddress);
    
    const campaignContract = await getCampaignContractWithSigner(campaignContractAddress, signer);
    
    console.log("📤 Sending withdraw transaction...");
    const tx = await campaignContract.withdraw();
    console.log("✅ Transaction sent! Hash:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ Withdrawal confirmed! Block:", receipt.blockNumber);
    
    return {
      ...receipt,
      hash: tx.hash,
      transactionHash: tx.hash
    };
  } catch (error) {
    console.error("❌ Error withdrawing:", error);
    throw error;
  }
};

// Legacy withdraw function
export const withdraw = async (signer, campaignIdOrAddress) => {
  // If it's a contract address, use the new method
  if (typeof campaignIdOrAddress === 'string' && 
      campaignIdOrAddress.startsWith('0x') && 
      campaignIdOrAddress.length === 42) {
    return await withdrawFromContract(signer, campaignIdOrAddress);
  }
  
  // Legacy fallback
  console.warn("⚠️ Legacy withdraw not supported with Factory Pattern");
  throw new Error("Please use campaign contract address for withdrawals");
};

// Claim refund from campaign contract (if campaign failed)
export const claimRefundFromContract = async (signer, campaignContractAddress) => {
  try {
    console.log("🔗 contract.js - Claiming refund from campaign contract...");
    console.log("Campaign Contract Address:", campaignContractAddress);
    
    const campaignContract = await getCampaignContractWithSigner(campaignContractAddress, signer);
    
    const tx = await campaignContract.claimRefund();
    console.log("✅ Transaction sent! Hash:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ Refund claimed! Block:", receipt.blockNumber);
    
    return {
      ...receipt,
      hash: tx.hash,
      transactionHash: tx.hash
    };
  } catch (error) {
    console.error("❌ Error claiming refund:", error);
    throw error;
  }
};

// Legacy refund function
export const refund = async (signer, campaignIdOrAddress) => {
  if (typeof campaignIdOrAddress === 'string' && 
      campaignIdOrAddress.startsWith('0x') && 
      campaignIdOrAddress.length === 42) {
    return await claimRefundFromContract(signer, campaignIdOrAddress);
  }
  
  console.warn("⚠️ Legacy refund not supported with Factory Pattern");
  throw new Error("Please use campaign contract address for refunds");
};

// Get campaign details from contract address
export const getCampaignDetailsFromContract = async (campaignContractAddress) => {
  try {
    const campaignContract = await getCampaignContract(campaignContractAddress);
    const details = await campaignContract.getCampaignDetails();
    
    return {
      creator: details[0],
      title: details[1],
      description: details[2],
      goal: ethers.formatEther(details[3]),
      deadline: new Date(Number(details[4]) * 1000),
      raised: ethers.formatEther(details[5]),
      donorCount: Number(details[6]),
      withdrawn: details[7],
      active: details[8],
      imageHash: details[9],
      contractAddress: campaignContractAddress
    };
  } catch (error) {
    console.error("Error fetching campaign details:", error);
    throw error;
  }
};

// Legacy getCampaign function  
export const getCampaign = async (campaignIdOrAddress) => {
  // If it's a contract address, use the new method
  if (typeof campaignIdOrAddress === 'string' && 
      campaignIdOrAddress.startsWith('0x') && 
      campaignIdOrAddress.length === 42) {
    return await getCampaignDetailsFromContract(campaignIdOrAddress);
  }
  
  // Legacy: get from factory by ID
  try {
    const factory = await getFactoryContract();
    const campaignAddress = await factory.getCampaignAddress(campaignIdOrAddress);
    return await getCampaignDetailsFromContract(campaignAddress);
  } catch (error) {
    console.error("Error fetching campaign:", error);
    throw error;
  }
};

// Get raised amount from campaign contract (real-time blockchain value)
export const getCampaignRaised = async (campaignContractAddress) => {
  try {
    const campaignContract = await getCampaignContract(campaignContractAddress);
    const raised = await campaignContract.raised();
    return ethers.formatEther(raised);
  } catch (error) {
    console.error("Error fetching raised amount:", error);
    throw error;
  }
};

// Get campaign contract balance
export const getCampaignBalance = async (campaignContractAddress) => {
  try {
    const campaignContract = await getCampaignContract(campaignContractAddress);
    const balance = await campaignContract.getBalance();
    return ethers.formatEther(balance);
  } catch (error) {
    console.error("Error fetching campaign balance:", error);
    throw error;
  }
};

// Get total campaign count from factory
export const getCampaignCount = async () => {
  try {
    const factory = await getFactoryContract();
    const count = await factory.campaignCount();
    return Number(count);
  } catch (error) {
    console.error("Error fetching campaign count:", error);
    throw error;
  }
};

// Create campaign via Factory (for admin use)
export const createCampaign = async (signer, creator, title, description, goal, durationDays, imageHash = '') => {
  try {
    const factoryWithSigner = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
    const goalInWei = ethers.parseEther(goal.toString());
    
    const tx = await factoryWithSigner.createCampaign(
      creator,
      title,
      description,
      goalInWei,
      durationDays,
      imageHash
    );
    
    const receipt = await tx.wait();
    
    // Parse the CampaignCreated event to get the campaign address
    const event = receipt.logs.find(log => {
      try {
        const parsed = factoryWithSigner.interface.parseLog(log);
        return parsed.name === 'CampaignCreated';
      } catch {
        return false;
      }
    });
    
    if (event) {
      const parsed = factoryWithSigner.interface.parseLog(event);
      return {
        receipt,
        campaignId: Number(parsed.args.campaignId),
        campaignAddress: parsed.args.campaignContract
      };
    }
    
    return { receipt };
  } catch (error) {
    console.error("Error creating campaign:", error);
    throw error;
  }
};

// Legacy createFund function
export const createFund = createCampaign;

// Export constants for external use
export { FACTORY_ADDRESS, CAMPAIGN_ABI, FACTORY_ABI };

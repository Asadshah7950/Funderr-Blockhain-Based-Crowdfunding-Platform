/**
 * Shared Blockchain Contract Helper
 * Platform-agnostic blockchain logic using ethers.js
 */

import { ethers } from 'ethers';
import { BLOCKCHAIN_CONFIG } from '../config';

// Import ABI - this will be loaded from the artifacts
let contractABI = null;

/**
 * Load contract ABI
 * This should be called with the ABI data loaded from platform-specific code
 */
export const loadContractABI = (abi) => {
  contractABI = abi;
};

/**
 * Get fallback minimal ABI if full ABI is not available
 */
const getFallbackABI = () => {
  console.warn('Using minimal ABI fallback');
  return [
    'function createCampaign(string memory _title, uint256 _goal, uint256 _durationDays) external',
    'function donate(uint256 _id) external payable',
    'function withdraw(uint256 _id) external',
    'function refund(uint256 _id) external',
    'function getCampaign(uint256 _id) external view returns (address, string, uint256, uint256, uint256, bool)',
    'function campaignCount() external view returns (uint256)',
  ];
};

/**
 * Get the contract ABI
 */
export const getABI = () => {
  if (contractABI && contractABI.abi) {
    return contractABI.abi;
  }
  if (contractABI && Array.isArray(contractABI)) {
    return contractABI;
  }
  return getFallbackABI();
};

// Provider instance (lazy initialization)
let provider = null;

/**
 * Initialize the JSON-RPC provider
 */
export const initializeProvider = () => {
  if (!provider) {
    try {
      provider = new ethers.JsonRpcProvider(BLOCKCHAIN_CONFIG.RPC_URL);
    } catch (error) {
      console.error('Failed to initialize provider:', error);
      throw error;
    }
  }
  return provider;
};

/**
 * Get read-only contract instance
 */
export const getContract = async () => {
  const prov = initializeProvider();
  const abi = getABI();
  
  try {
    return new ethers.Contract(BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS, abi, prov);
  } catch (error) {
    console.error('Failed to initialize contract:', error);
    throw error;
  }
};

/**
 * Get contract instance with signer for write operations
 * @param {ethers.Signer} signer - The signer to use
 */
export const getContractWithSigner = async (signer) => {
  const abi = getABI();
  
  try {
    return new ethers.Contract(BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS, abi, signer);
  } catch (error) {
    console.error('Failed to create contract with signer:', error);
    throw error;
  }
};

/**
 * Create a new fundraising campaign
 * @param {ethers.Signer} signer - The signer to use
 * @param {string} title - Campaign title
 * @param {number|string} goal - Funding goal in ETH
 * @param {number} durationDays - Campaign duration in days
 */
export const createFund = async (signer, title, goal, durationDays) => {
  try {
    const contractWithSigner = await getContractWithSigner(signer);
    const goalInWei = ethers.parseEther(goal.toString());
    
    const tx = await contractWithSigner.createCampaign(title, goalInWei, durationDays);
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error('Error creating campaign:', error);
    throw error;
  }
};

/**
 * Donate to a campaign
 * @param {ethers.Signer} signer - The signer to use
 * @param {number} campaignId - Campaign ID
 * @param {number|string} amount - Donation amount in ETH
 */
export const donate = async (signer, campaignId, amount) => {
  try {
    console.log('🔗 Creating donation transaction...');
    console.log('Campaign ID:', campaignId, 'Amount:', amount);
    
    const contractWithSigner = await getContractWithSigner(signer);
    const amountInWei = ethers.parseEther(amount.toString());
    console.log('Amount in Wei:', amountInWei.toString());
    
    console.log('📤 Sending transaction to blockchain...');
    const tx = await contractWithSigner.donate(campaignId, { value: amountInWei });
    console.log('✅ Transaction sent! Hash:', tx.hash);
    console.log('⏳ Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed! Block:', receipt.blockNumber);
    
    return {
      ...receipt,
      hash: tx.hash,
      transactionHash: tx.hash,
    };
  } catch (error) {
    console.error('❌ Error donating:', error);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    throw error;
  }
};

/**
 * Withdraw funds (only campaign creator)
 * @param {ethers.Signer} signer - The signer to use
 * @param {number} campaignId - Campaign ID
 */
export const withdraw = async (signer, campaignId) => {
  try {
    const contractWithSigner = await getContractWithSigner(signer);
    
    const tx = await contractWithSigner.withdraw(campaignId);
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error('Error withdrawing:', error);
    throw error;
  }
};

/**
 * Claim refund (if goal not reached)
 * @param {ethers.Signer} signer - The signer to use
 * @param {number} campaignId - Campaign ID
 */
export const refund = async (signer, campaignId) => {
  try {
    const contractWithSigner = await getContractWithSigner(signer);
    
    const tx = await contractWithSigner.refund(campaignId);
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error('Error claiming refund:', error);
    throw error;
  }
};

/**
 * Get campaign details from blockchain
 * @param {number} campaignId - Campaign ID
 */
export const getCampaign = async (campaignId) => {
  try {
    const contractInstance = await getContract();
    const campaign = await contractInstance.getCampaign(campaignId);
    
    return {
      creator: campaign[0],
      title: campaign[1],
      goal: ethers.formatEther(campaign[2]),
      deadline: new Date(Number(campaign[3]) * 1000),
      raised: ethers.formatEther(campaign[4]),
      active: campaign[5],
    };
  } catch (error) {
    console.error('Error fetching campaign:', error);
    throw error;
  }
};

/**
 * Get total campaign count
 */
export const getCampaignCount = async () => {
  try {
    const contractInstance = await getContract();
    const count = await contractInstance.campaignCount();
    return Number(count);
  } catch (error) {
    console.error('Error fetching campaign count:', error);
    throw error;
  }
};

/**
 * Format Wei to ETH string
 * @param {bigint|string} wei - Amount in Wei
 */
export const formatEther = (wei) => {
  return ethers.formatEther(wei);
};

/**
 * Parse ETH string to Wei
 * @param {string|number} eth - Amount in ETH
 */
export const parseEther = (eth) => {
  return ethers.parseEther(eth.toString());
};

export default {
  loadContractABI,
  getABI,
  initializeProvider,
  getContract,
  getContractWithSigner,
  createFund,
  donate,
  withdraw,
  refund,
  getCampaign,
  getCampaignCount,
  formatEther,
  parseEther,
  BLOCKCHAIN_CONFIG,
};

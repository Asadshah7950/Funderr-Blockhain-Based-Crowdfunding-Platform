import express from 'express';
import Campaign from '../models/Campaign.mjs';
import User from '../models/User.mjs';
import Notification from '../models/Notification.mjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import blockchainService from '../services/BlockchainService.mjs';
import NotificationService from '../services/NotificationService.mjs';

dotenv.config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'funderr-secret-key';

// Middleware to authenticate user
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token required' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Create a new campaign
router.post('/', authenticate, async (req, res) => {
  try {
    // Check if user is restricted
    if (req.user.status === 'restricted') {
      return res.status(403).json({ 
        message: 'Your account is restricted. You cannot create campaigns at this time. Please contact the administrator for assistance.',
        code: 'USER_RESTRICTED'
      });
    }
    
    // Check if campaign creator is approved
    if (req.user.role === 'campaign_creator' && req.user.approvalStatus !== 'approved') {
      if (req.user.approvalStatus === 'pending') {
        return res.status(403).json({ 
          message: 'Your profile is awaiting admin approval. You cannot create campaigns until approved.',
          code: 'APPROVAL_PENDING'
        });
      } else if (req.user.approvalStatus === 'rejected') {
        return res.status(403).json({ 
          message: `Your profile was rejected: ${req.user.rejectionReason || 'No reason provided'}. Please contact support.`,
          code: 'APPROVAL_REJECTED'
        });
      }
    }
    
    const { title, description, goal, category, imageKey, walletAddress, duration } = req.body;
    
    // Wallet address is required for blockchain registration
    if (!walletAddress) {
      return res.status(400).json({ 
        message: 'Wallet address is required. Please connect your MetaMask wallet before creating a campaign.',
        code: 'WALLET_REQUIRED'
      });
    }

    // Validate wallet address format (basic check)
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ 
        message: 'Invalid wallet address format.',
        code: 'INVALID_WALLET'
      });
    }

    const campaign = new Campaign({
      title,
      description,
      goal,
      category,
      imageKey,
      duration: duration || 30,
      walletAddress, // Store creator's wallet for blockchain registration
      creatorId: req.user._id,
      creatorName: req.user.name,
      status: 'pending',
    });
    
    // Also update user's wallet address if not set
    if (!req.user.walletAddress && walletAddress) {
      req.user.walletAddress = walletAddress;
      await req.user.save();
    }
    
    await campaign.save();
    console.log('✅ Campaign created with wallet:', walletAddress);
    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ message: 'Error creating campaign', error });
  }
});

// Get featured campaigns (public - no auth required)
router.get('/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const campaigns = await Campaign.find({ status: 'approved' })
      .sort({ dateCreated: -1 })
      .limit(limit)
      .select('title description goal amountRaised contributors category imageKey creatorName dateCreated duration walletAddress campaignContractAddress blockchainTxHash approvalStatus');
    
    // Add computed fields
    const campaignsWithStats = campaigns.map(campaign => ({
      ...campaign.toObject(),
      contributorsCount: campaign.contributors ? campaign.contributors.length : 0
    }));
    
    res.status(200).json(campaignsWithStats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching featured campaigns', error });
  }
});

// List campaigns (optionally filter by status)
router.get('/', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const campaigns = await Campaign.find(filter).sort({ dateCreated: -1 });
    res.status(200).json(campaigns);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching campaigns', error });
  }
});

// Approve a campaign (admin only) - Creates individual campaign contract via Factory
router.put('/:id/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    
    if (campaign.status === 'approved') {
      return res.status(400).json({ message: 'Campaign is already approved' });
    }

    // ============ USE CAMPAIGN'S WALLET ADDRESS ============
    // Priority: campaign.walletAddress > user.walletAddress > platform wallet
    let creatorWallet = campaign.walletAddress;
    
    // Fallback to user's wallet if campaign wallet not set (legacy campaigns)
    if (!creatorWallet) {
      const creator = await User.findById(campaign.creatorId);
      creatorWallet = creator?.walletAddress || null;
      
      // Update campaign with user's wallet for future reference
      if (creatorWallet) {
        campaign.walletAddress = creatorWallet;
      }
    }

    console.log('💼 Campaign creator wallet:', creatorWallet || 'Not set (will use platform wallet)');

    // Register campaign on blockchain via Factory (creates individual contract)
    console.log('🔗 Creating campaign contract via Factory...');
    let blockchainResult = { success: false };
    
    if (blockchainService.isReady()) {
      blockchainResult = await blockchainService.createCampaignOnBlockchain(
        creatorWallet, // Creator's wallet - this address will own the contract!
        campaign.title,
        campaign.description,
        campaign.goal,
        campaign.duration || 30,
        campaign.imageKey || ''
      );

      if (blockchainResult.success) {
        campaign.blockchainId = blockchainResult.blockchainId;
        campaign.blockchainTxHash = blockchainResult.transactionHash;
        campaign.campaignContractAddress = blockchainResult.campaignContractAddress; // NEW: Individual contract address
        console.log('✅ Campaign contract created!');
        console.log('🆔 Blockchain ID:', blockchainResult.blockchainId);
        console.log('👤 Contract Owner:', creatorWallet || 'Platform Wallet');
        console.log('📜 Campaign Contract:', blockchainResult.campaignContractAddress);
        console.log('📄 Transaction hash:', blockchainResult.transactionHash);
        console.log('🔍 View campaign on Etherscan:', blockchainResult.campaignExplorerUrl);
      } else {
        console.warn('⚠️ Blockchain registration failed:', blockchainResult.error);
        // Still approve the campaign but log the issue
      }
    } else {
      console.warn('⚠️ Blockchain service not ready - campaign will be approved without blockchain registration');
    }

    // Update campaign status
    campaign.status = 'approved';
    campaign.rejectionReason = '';
    campaign.approvedAt = new Date();
    campaign.approvedBy = req.user._id;
    await campaign.save();

    // Notify all donors about new campaign launch
    try {
      const donors = await User.find({ role: 'donor', status: { $ne: 'restricted' } });
      console.log(`📢 Notifying ${donors.length} donors about new campaign: "${campaign.title}"`);
      
      for (const donor of donors) {
        await Notification.createNotification({
          userId: donor._id,
          type: 'NEW_CAMPAIGN',
          title: 'New Campaign Launched! 🚀',
          message: `A new campaign "${campaign.title}" has been launched. Check it out and make a difference!`,
          icon: '🆕',
          data: {
            campaignId: campaign._id,
            campaignTitle: campaign.title,
            campaignGoal: campaign.goal,
            campaignCategory: campaign.category
          }
        });
      }
      console.log(`✅ Sent notifications to ${donors.length} donors`);
    } catch (notifyError) {
      console.error('⚠️ Failed to notify donors:', notifyError);
      // Don't fail the campaign approval if notifications fail
    }
    
    // Send notifications about campaign approval
    try {
      // Notify campaign creator about approval
      await NotificationService.notifyCampaignApproved(campaign);
      // Notify all donors about the new campaign
      await NotificationService.notifyNewCampaign(campaign);
      // Notify previous donors of this creator about their new campaign
      const creator = await User.findById(campaign.creatorId);
      const creatorName = creator?.name || creator?.email || 'A creator';
      await NotificationService.notifyPreviousDonorsOfNewCampaign(campaign, creatorName);
    } catch (notifError) {
      console.error('Error sending campaign approval notifications:', notifError);
    }
    
    res.status(200).json({
      success: true,
      message: blockchainResult.success 
        ? 'Campaign approved - Individual smart contract created!' 
        : 'Campaign approved (blockchain registration pending)',
      campaign,
      blockchain: blockchainResult.success ? {
        blockchainId: blockchainResult.blockchainId,
        campaignContractAddress: blockchainResult.campaignContractAddress,
        transactionHash: blockchainResult.transactionHash,
        explorerUrl: blockchainResult.explorerUrl,
        campaignExplorerUrl: blockchainResult.campaignExplorerUrl,
      } : null,
    });
  } catch (error) {
    console.error('Error approving campaign:', error);
    res.status(500).json({ message: 'Error approving campaign', error: error.message });
  }
});

// Reject a campaign (admin only)
router.put('/:id/reject', authenticate, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectionReason: reason || 'Not approved by admin' },
      { new: true }
    );
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    
    // Send notification to campaign creator about rejection
    try {
      await NotificationService.notifyCampaignRejected(campaign, reason);
    } catch (notifError) {
      console.error('Error sending campaign rejection notification:', notifError);
    }
    
    res.status(200).json(campaign);
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting campaign', error });
  }
});

// Get campaigns for a specific user
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const campaigns = await Campaign.find({ creatorId: req.params.userId });
    res.status(200).json(campaigns);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user campaigns', error });
  }
});

// Delete a campaign (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    res.status(200).json({ message: 'Campaign deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting campaign', error });
  }
});

// ===================== ACCOUNTABILITY / SPENDINGS ROUTES =====================

// Get a single campaign by ID (public - for viewing spendings)
router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    res.status(200).json(campaign);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching campaign', error });
  }
});

// Get spendings for a campaign (public - donors can view)
router.get('/:id/spendings', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    
    const totalSpent = (campaign.spendings || []).reduce((sum, s) => sum + s.amount, 0);
    
    res.status(200).json({
      spendings: campaign.spendings || [],
      totalSpent,
      amountRaised: campaign.amountRaised || 0,
      remainingFunds: (campaign.amountRaised || 0) - totalSpent
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching spendings', error });
  }
});

// Add a spending record (campaign creator only)
router.post('/:id/spendings', authenticate, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    
    // Verify the user is the campaign creator
    if (campaign.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the campaign creator can add spending records' });
    }
    
    const { description, amount, receiptUrl, receiptPublicId, category, blockchainRaised } = req.body;
    
    // Validate required fields
    if (!description || !amount || !receiptUrl) {
      return res.status(400).json({ message: 'Description, amount, and receipt are required' });
    }
    
    // Validate amount is positive
    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }
    
    // Calculate total spent so far
    const currentTotalSpent = (campaign.spendings || []).reduce((sum, s) => sum + s.amount, 0);
    
    // Use blockchain raised amount if provided (more accurate), otherwise fall back to MongoDB
    // This handles the case where donations are made via blockchain but MongoDB isn't synced
    const effectiveRaised = blockchainRaised !== undefined && blockchainRaised !== null 
      ? parseFloat(blockchainRaised) 
      : (campaign.amountRaised || 0);
    
    // Check if spending exceeds available funds
    if (currentTotalSpent + amount > effectiveRaised) {
      return res.status(400).json({ 
        message: 'Spending amount exceeds available funds',
        availableFunds: effectiveRaised - currentTotalSpent,
        totalRaised: effectiveRaised,
        totalSpent: currentTotalSpent
      });
    }
    
    // Add the spending record
    const spending = {
      description,
      amount,
      receiptUrl,
      receiptPublicId,
      category: category || 'General',
      date: new Date()
    };
    
    campaign.spendings = campaign.spendings || [];
    campaign.spendings.push(spending);
    await campaign.save();
    
    // Notify donors about the new spending record
    try {
      const donorIds = campaign.contributors
        .map(c => c.userId)
        .filter(id => id);
      if (donorIds.length > 0) {
        await NotificationService.notifySpendingAdded(campaign, spending, donorIds);
      }
    } catch (notifError) {
      console.error('Error sending spending notification:', notifError);
    }
    
    res.status(201).json({
      message: 'Spending record added successfully',
      spending: campaign.spendings[campaign.spendings.length - 1],
      totalSpent: currentTotalSpent + amount,
      remainingFunds: campaign.amountRaised - (currentTotalSpent + amount)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding spending record', error });
  }
});

// Delete a spending record (campaign creator only)
router.delete('/:id/spendings/:spendingId', authenticate, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    
    // Verify the user is the campaign creator
    if (campaign.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the campaign creator can delete spending records' });
    }
    
    // Find and remove the spending
    const spendingIndex = campaign.spendings.findIndex(
      s => s._id.toString() === req.params.spendingId
    );
    
    if (spendingIndex === -1) {
      return res.status(404).json({ message: 'Spending record not found' });
    }
    
    campaign.spendings.splice(spendingIndex, 1);
    await campaign.save();
    
    res.status(200).json({ message: 'Spending record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting spending record', error });
  }
});

// ===================== DONATION ROUTES =====================

// Record a donation (from smart contract transaction)
router.post('/:id/donate', authenticate, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    
    const { amount, transactionHash, walletAddress, message } = req.body;
    
    // Validate required fields
    if (!amount || !transactionHash || !walletAddress) {
      return res.status(400).json({ message: 'Amount, transaction hash, and wallet address are required' });
    }
    
    // Validate amount is positive
    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }
    
    // Add the donation record
    const donation = {
      walletAddress,
      amount,
      transactionHash,
      message: message || '',
      date: new Date()
    };
    
    campaign.donations = campaign.donations || [];
    campaign.donations.push(donation);
    
    // Update amount raised
    campaign.amountRaised = (campaign.amountRaised || 0) + amount;
    
    // Add to contributors if user is logged in
    if (req.user) {
      const existingContributor = campaign.contributors.find(
        c => c.userId && c.userId.toString() === req.user._id.toString()
      );
      
      if (existingContributor) {
        existingContributor.amount += amount;
        existingContributor.date = new Date();
      } else {
        campaign.contributors.push({
          userId: req.user._id,
          amount,
          date: new Date()
        });
      }
    }
    
    await campaign.save();
    
    // Send notifications
    try {
      // Get donor name if available
      const donorName = req.user ? (req.user.name || req.user.email) : 'Anonymous';
      
      // Notify campaign creator about new donation
      await NotificationService.notifyNewDonation(campaign, donation, donorName);
      
      // Notify donor about successful donation
      if (req.user) {
        await NotificationService.notifyDonationSuccess(req.user._id, donation, campaign);
      }
      
      // Check for milestones (25%, 50%, 75%, 100%)
      const percentageReached = (campaign.amountRaised / campaign.goal) * 100;
      const milestones = [25, 50, 75, 100];
      const previousPercentage = ((campaign.amountRaised - amount) / campaign.goal) * 100;
      
      for (const milestone of milestones) {
        if (percentageReached >= milestone && previousPercentage < milestone) {
          await NotificationService.notifyMilestoneReached(campaign, milestone);
          
          // If goal reached, notify all donors
          if (milestone === 100) {
            const donorIds = campaign.contributors.map(c => c.userId).filter(id => id);
            await NotificationService.notifyCampaignGoalReached(campaign, donorIds);
          }
          break; // Only trigger one milestone notification at a time
        }
      }
    } catch (notifError) {
      console.error('Error sending donation notifications:', notifError);
    }
    
    res.status(201).json({
      message: 'Donation recorded successfully',
      donation: campaign.donations[campaign.donations.length - 1],
      newAmountRaised: campaign.amountRaised,
      contributorsCount: campaign.contributors.length
    });
  } catch (error) {
    console.error('Error recording donation:', error);
    res.status(500).json({ message: 'Error recording donation', error: error.message });
  }
});

// Get donations for a campaign (public)
router.get('/:id/donations', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    
    const totalDonated = (campaign.donations || []).reduce((sum, d) => sum + d.amount, 0);
    
    res.status(200).json({
      donations: campaign.donations || [],
      totalDonated,
      donorsCount: (campaign.donations || []).length,
      goal: campaign.goal,
      percentageReached: ((totalDonated / campaign.goal) * 100).toFixed(2)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching donations', error });
  }
});

// Update campaign with blockchain ID (after creating on smart contract)
router.put('/:id/blockchain', authenticate, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    
    // Verify the user is the campaign creator or admin
    if (campaign.creatorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the campaign creator can update blockchain info' });
    }
    
    const { blockchainId, walletAddress } = req.body;
    
    if (blockchainId !== undefined) {
      campaign.blockchainId = blockchainId;
    }
    
    if (walletAddress) {
      campaign.walletAddress = walletAddress;
    }
    
    await campaign.save();
    
    res.status(200).json({
      message: 'Campaign blockchain info updated',
      blockchainId: campaign.blockchainId,
      walletAddress: campaign.walletAddress
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating campaign blockchain info', error });
  }
});

// Get blockchain info for a campaign (Factory Pattern - individual contract)
router.get('/:id/blockchain', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    if (!campaign.campaignContractAddress) {
      return res.json({
        success: true,
        registered: false,
        message: 'Campaign not yet registered on blockchain',
        networkInfo: blockchainService.getNetworkInfo(),
      });
    }

    // Fetch latest data from blockchain (individual campaign contract)
    let blockchainData = null;
    let blockchainDonations = [];
    
    if (blockchainService.isReady()) {
      const campaignResult = await blockchainService.getCampaignFromBlockchain(campaign.campaignContractAddress);
      if (campaignResult.success) {
        blockchainData = campaignResult.data;
        
        // Sync amount raised from blockchain (source of truth)
        const blockchainAmount = parseFloat(blockchainData.raised);
        if (blockchainAmount > campaign.amountRaised) {
          campaign.amountRaised = blockchainAmount;
          await campaign.save();
        }
      }
      
      const donationsResult = await blockchainService.getCampaignDonations(campaign.campaignContractAddress);
      if (donationsResult.success) {
        blockchainDonations = donationsResult.donations;
      }
    }

    res.json({
      success: true,
      registered: true,
      blockchainId: campaign.blockchainId,
      campaignContractAddress: campaign.campaignContractAddress,
      transactionHash: campaign.blockchainTxHash,
      explorerUrl: blockchainService.getTransactionUrl(campaign.blockchainTxHash),
      campaignExplorerUrl: blockchainService.getAddressUrl(campaign.campaignContractAddress),
      factoryUrl: blockchainService.getFactoryUrl(),
      blockchainData,
      blockchainDonations,
      networkInfo: blockchainService.getNetworkInfo(),
    });
  } catch (error) {
    console.error('Error fetching blockchain info:', error);
    res.status(500).json({ message: 'Error fetching blockchain info', error: error.message });
  }
});

// Check if user can donate (not the creator - self-donation prevention)
router.post('/:id/can-donate', authenticate, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    
    const { walletAddress } = req.body;
    
    // Check 1: User ID match (database level)
    if (campaign.creatorId.toString() === req.user._id.toString()) {
      return res.json({
        canDonate: false,
        reason: 'Campaign creators cannot donate to their own campaigns',
        isCreator: true
      });
    }
    
    // Check 2: Wallet address match (blockchain level)
    if (campaign.campaignContractAddress && walletAddress) {
      const result = await blockchainService.canDonate(campaign.campaignContractAddress, walletAddress);
      return res.json(result);
    }
    
    // Default: can donate
    res.json({
      canDonate: true,
      reason: 'Eligible to donate',
      isCreator: false
    });
  } catch (error) {
    console.error('Error checking donation eligibility:', error);
    res.status(500).json({ message: 'Error checking donation eligibility', error: error.message });
  }
});

// Verify a donation transaction
router.post('/verify-donation', authenticate, async (req, res) => {
  try {
    const { transactionHash, campaignId } = req.body;
    
    if (!transactionHash) {
      return res.status(400).json({ message: 'Transaction hash required' });
    }
    
    const result = await blockchainService.verifyDonation(transactionHash);
    
    // If verified and campaignId provided, update campaign
    if (result.success && campaignId) {
      const campaign = await Campaign.findById(campaignId);
      if (campaign) {
        // Find the donation record and update status
        const donation = campaign.donations?.find(d => d.transactionHash === transactionHash);
        if (donation) {
          donation.status = result.status;
          donation.blockNumber = result.blockNumber;
          await campaign.save();
        }
      }
    }
    
    res.json({
      success: true,
      verification: result,
    });
  } catch (error) {
    console.error('Error verifying donation:', error);
    res.status(500).json({ message: 'Error verifying donation', error: error.message });
  }
});

// Get blockchain network info
router.get('/blockchain/info', async (req, res) => {
  try {
    const networkInfo = blockchainService.getNetworkInfo();
    const totalCampaigns = await blockchainService.getTotalCampaigns();
    const contractBalance = await blockchainService.getContractBalance();
    
    res.json({
      success: true,
      ...networkInfo,
      totalCampaignsOnChain: totalCampaigns,
      contractBalance: contractBalance + ' ETH',
    });
  } catch (error) {
    console.error('Error getting blockchain info:', error);
    res.status(500).json({ message: 'Error getting blockchain info', error: error.message });
  }
});

// Get withdrawal status for a campaign
router.get('/:id/withdraw-status', authenticate, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    
    // Verify the user is the campaign creator
    if (campaign.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the campaign creator can check withdrawal status' });
    }
    
    // Check blockchain status if contract address exists
    let blockchainStatus = {
      canWithdraw: false,
      reason: 'Campaign not deployed to blockchain',
      balance: '0',
      raised: '0',
      withdrawn: false,
    };
    
    if (campaign.campaignContractAddress && blockchainService.isReady()) {
      try {
        const campaignData = await blockchainService.getCampaignFromBlockchain(campaign.campaignContractAddress);
        const balance = await blockchainService.getCampaignBalance(campaign.campaignContractAddress);
        
        if (campaignData.success) {
          const data = campaignData.data;
          const goalReached = parseFloat(data.raised) >= parseFloat(data.goal);
          const deadlinePassed = new Date(data.deadline) < new Date();
          const canWithdraw = (goalReached || deadlinePassed) && !data.withdrawn && parseFloat(balance) > 0;
          
          let reason = '';
          if (data.withdrawn) {
            reason = 'Funds already withdrawn';
          } else if (parseFloat(balance) <= 0) {
            reason = 'No funds to withdraw';
          } else if (!goalReached && !deadlinePassed) {
            reason = 'Campaign goal not reached and deadline not passed';
          } else {
            reason = canWithdraw ? 'Ready to withdraw' : 'Cannot withdraw yet';
          }
          
          blockchainStatus = {
            canWithdraw,
            reason,
            balance: balance,
            raised: data.raised,
            goal: data.goal,
            withdrawn: data.withdrawn,
            active: data.active,
            deadline: data.deadline,
            goalReached,
            deadlinePassed,
            contractAddress: campaign.campaignContractAddress,
            explorerUrl: blockchainService.getAddressUrl(campaign.campaignContractAddress),
          };
        }
      } catch (error) {
        console.error('Error checking blockchain status:', error);
        blockchainStatus.reason = 'Error checking blockchain: ' + error.message;
      }
    }
    
    res.json({
      success: true,
      campaign: {
        id: campaign._id,
        title: campaign.title,
        status: campaign.status,
        walletAddress: campaign.walletAddress,
        campaignContractAddress: campaign.campaignContractAddress,
      },
      blockchain: blockchainStatus,
    });
  } catch (error) {
    console.error('Error getting withdrawal status:', error);
    res.status(500).json({ message: 'Error getting withdrawal status', error: error.message });
  }
});

export default router;

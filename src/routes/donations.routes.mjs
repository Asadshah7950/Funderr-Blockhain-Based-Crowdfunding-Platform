import express from 'express';
import Donation from '../models/Donation.mjs';
import Campaign from '../models/Campaign.mjs';
import User from '../models/User.mjs';
import Notification from '../models/Notification.mjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

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
    console.error('Authentication error:', error);
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

/**
 * POST /api/donations
 * Record a new donation and notify admin
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { 
      campaignId, 
      amount, 
      message, 
      transactionHash, 
      isAnonymous,
      blockchainCampaignId // Optional: blockchain campaign ID if different from MongoDB ID
    } = req.body;

    // Validate required fields
    if (!campaignId || !amount) {
      return res.status(400).json({ message: 'Campaign ID and amount are required' });
    }

    // Find campaign
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    console.log('📝 Recording donation:', { campaignId, amount, userId: req.user._id, userName: req.user.name || req.user.email });
    console.log('📝 Campaign creator:', campaign.creatorId);

    // Get donor name with fallback
    const donorDisplayName = req.user.name || req.user.email?.split('@')[0] || 'A donor';

    // Create donation record
    const donation = new Donation({
      campaignId: campaign._id,
      campaignTitle: campaign.title,
      donorId: req.user._id,
      donorName: isAnonymous ? 'Anonymous' : donorDisplayName,
      donorEmail: req.user.email,
      donorWallet: req.user.walletAddress,
      amount: parseFloat(amount),
      message: message || '',
      transactionHash: transactionHash || '',
      isAnonymous: isAnonymous || false,
      status: 'completed'
    });

    await donation.save();

    // Update campaign's amountRaised
    campaign.amountRaised = (campaign.amountRaised || 0) + parseFloat(amount);
    campaign.contributors = campaign.contributors || [];
    campaign.contributors.push({
      userId: req.user._id,
      amount: parseFloat(amount),
      date: new Date()
    });
    await campaign.save();

    // Notify the campaign creator
    console.log('🔔 Creating notification for campaign creator:', campaign.creatorId);
    try {
      const creatorNotification = await Notification.createNotification({
        userId: campaign.creatorId,
        type: 'NEW_DONATION',
        title: 'New Donation Received! 🎉',
        message: `${isAnonymous ? 'An anonymous donor' : donorDisplayName} donated ${amount} ETH to your campaign "${campaign.title}"`,
        icon: '💰',
        data: {
          campaignId: campaign._id,
          donationAmount: parseFloat(amount),
          donorName: isAnonymous ? 'Anonymous' : donorDisplayName
        }
      });
      console.log('✅ Creator notification created:', creatorNotification._id);
    } catch (notifyError) {
      console.error('❌ Failed to create creator notification:', notifyError);
    }

    // Notify all admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await Notification.createNotification({
        userId: admin._id,
        type: 'ADMIN_NEW_DONATION',
        title: 'New Donation Alert 💰',
        message: `${isAnonymous ? 'Anonymous' : donorDisplayName} donated ${amount} ETH to "${campaign.title}"`,
        icon: '💰',
        data: {
          campaignId: campaign._id,
          donationAmount: parseFloat(amount),
          donorName: isAnonymous ? 'Anonymous' : donorDisplayName
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Donation recorded successfully',
      donation: {
        id: donation._id,
        amount: donation.amount,
        campaignTitle: donation.campaignTitle,
        createdAt: donation.createdAt
      }
    });
  } catch (error) {
    console.error('Error recording donation:', error);
    res.status(500).json({ message: 'Failed to record donation', error: error.message });
  }
});

/**
 * GET /api/donations/recent
 * Get recent donations (admin only)
 */
router.get('/recent', authenticate, requireAdmin, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const donations = await Donation.getRecentDonations(parseInt(limit));
    
    res.json({
      success: true,
      donations
    });
  } catch (error) {
    console.error('Error fetching recent donations:', error);
    res.status(500).json({ message: 'Failed to fetch donations' });
  }
});

/**
 * GET /api/donations/stats
 * Get donation statistics (admin only)
 */
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const stats = await Donation.getDonationStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching donation stats:', error);
    res.status(500).json({ message: 'Failed to fetch donation stats' });
  }
});

/**
 * GET /api/donations/campaign/:campaignId
 * Get donations for a specific campaign
 */
router.get('/campaign/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { limit = 20 } = req.query;
    
    const donations = await Donation.find({ 
      campaignId, 
      status: 'completed' 
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('donorName amount message createdAt isAnonymous');
    
    res.json({
      success: true,
      donations
    });
  } catch (error) {
    console.error('Error fetching campaign donations:', error);
    res.status(500).json({ message: 'Failed to fetch donations' });
  }
});

/**
 * GET /api/donations/my
 * Get donations made by the authenticated user
 */
router.get('/my', authenticate, async (req, res) => {
  try {
    const donations = await Donation.find({ donorId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('campaignId', 'title imageKey status');
    
    res.json({
      success: true,
      donations
    });
  } catch (error) {
    console.error('Error fetching user donations:', error);
    res.status(500).json({ message: 'Failed to fetch your donations' });
  }
});

export default router;
